import type { DraftConfig } from './types';

export function buildBridgeScript(cfg: DraftConfig): string {
  const now = new Date().toISOString().slice(0, 10);
  return String.raw`// ============================================================
// BitMonitor — Apps Script Bridge v${cfg.scriptVersion}
// Generated: ${now}
// Account: ${cfg.accountNickname || '(set in _settings_bridge)'}
//
// Read endpoints require ?token=YOUR_TOKEN:
//   ?path=/health
//   ?path=/sync-runs
//   ?path=/script-health
//   ?path=/errors
//   ?path=/tab&name=TAB
//   ?path=/csv&tab=TAB
//   ?path=/json&tab=TAB
//
// Write endpoint for owner/local dashboard action queue:
//   POST ?path=/action&token=YOUR_TOKEN
//   body: { "tab": "budget" | "bid", "row": { ... } }
//
// This bridge only writes approved queue rows into the Sheet.
// Google Ads mutations are performed later by the Google Ads Script runner.
// ============================================================

var SHEET_URL     = "PASTE_GENERATED_SHEET_URL_HERE";
var CFG_TAB       = "_settings_bridge";
var HEALTH_TAB    = "_script_health";
var RUNS_TAB      = "_sync_runs";
var ERRORS_TAB    = "_error_log";
var BRIDGE_VER    = "${cfg.scriptVersion}";

var BUDGET_ACTIONS_TAB = "_budget_actions";
var BID_ACTIONS_TAB    = "_bid_actions";
var ACTION_LOG_TAB     = "_action_log";

var BUDGET_ACTION_HEADERS = ["action_id","created_at","account_id","customer_id","campaign_id","campaign_name","action_type","expected_current_budget","target_budget","max_change_pct","currency","reason","evidence","approval_status","approved_by","approved_at","status","picked_at","applied_at","result","message","script_version","last_checked_current_budget","rollback_budget"];
var BID_ACTION_HEADERS = ["action_id","created_at","account_id","customer_id","campaign_id","ad_group_id","criterion_id","entity_level","entity_name","action_type","expected_current_bid","target_bid","min_bid","max_bid","max_change_pct","reason","approval_status","approved_by","approved_at","status","picked_at","applied_at","result","message","script_version","last_checked_current_bid","rollback_bid"];
var ACTION_LOG_HEADERS = ["log_id","action_id","action_tab","logged_at","account_id","customer_id","campaign_id","entity_level","action_type","old_value","new_value","result","message","script_version","sync_run_id"];

function doGet(e) {
  return handleRequest_(e, "GET");
}

function doPost(e) {
  return handleRequest_(e, "POST");
}

function handleRequest_(e, method) {
  var cfg;
  try {
    cfg = readBridgeConfig_();
  } catch (err) {
    return jsonError_(500, "Cannot open Sheet or read config: " + err.message);
  }

  if (cfg.BRIDGE_ENABLED !== "true") return jsonError_(403, "Bridge is disabled");

  var reqToken = (e && e.parameter && e.parameter.token) ? e.parameter.token : "";
  if (!reqToken || reqToken !== cfg.BRIDGE_TOKEN_PLACEHOLDER) {
    logIfEnabled_(cfg, "AUTH_FAIL", "Invalid or missing token from request");
    return jsonError_(401, "Unauthorized");
  }

  var path = (e && e.parameter && e.parameter.path) ? e.parameter.path : "";

  try {
    if (path === "/health")        return handleHealth_(cfg);
    if (path === "/sync-runs")     return handleSyncRuns_(cfg);
    if (path === "/script-health") return handleScriptHealth_(cfg);
    if (path === "/errors")        return handleErrors_(cfg);
    if (path === "/tab")           return handleTabJson_(cfg, e);
    if (path === "/json")          return handleTabJson_(cfg, e);
    if (path === "/csv")           return handleTabCsv_(cfg, e);
    if (path === "/action")        return handleActionPost_(cfg, e, method);
    return jsonError_(404, "Unknown endpoint. Valid: /health /sync-runs /script-health /errors /tab /json /csv /action");
  } catch (err) {
    logIfEnabled_(cfg, "RUNTIME_ERROR", String(err.message));
    return jsonError_(500, "Internal error: " + err.message);
  }
}

function readBridgeConfig_() {
  var ss = SpreadsheetApp.openByUrl(SHEET_URL);
  var sheet = ss.getSheetByName(CFG_TAB);
  if (!sheet) throw new Error("Tab not found: " + CFG_TAB);
  var data = sheet.getDataRange().getValues();
  var cfg = { _ss: ss };
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]).trim();
    var val = String(data[i][1]).trim();
    if (key) cfg[key] = val;
  }
  cfg._cacheSeconds = parseInt(cfg.CACHE_SECONDS || "300", 10);
  if (isNaN(cfg._cacheSeconds) || cfg._cacheSeconds < 0) cfg._cacheSeconds = 300;
  return cfg;
}

function handleHealth_(cfg) {
  var ss = cfg._ss;
  var lastSync = "";
  try {
    var runsSheet = ss.getSheetByName(RUNS_TAB);
    if (runsSheet && runsSheet.getLastRow() > 1) {
      var lastRow = runsSheet.getLastRow();
      lastSync = String(runsSheet.getRange(lastRow, 2).getValue());
    }
  } catch (e) {}

  return jsonOk_({
    status: "ok",
    bridge_ver: BRIDGE_VER,
    sheet_url: SHEET_URL.substring(0, 60) + "...",
    bridge_enabled: cfg.BRIDGE_ENABLED,
    cache_enabled: cfg.ENABLE_CACHE,
    action_post_enabled: cfg.ALLOW_POST,
    last_sync_at: lastSync,
    timestamp: new Date().toISOString()
  });
}

function handleSyncRuns_(cfg) {
  var rows = readTabRows_(cfg._ss, RUNS_TAB);
  return jsonOk_({ tab: RUNS_TAB, row_count: rows.data.length, columns: rows.headers, data: rows.data });
}

function handleScriptHealth_(cfg) {
  var rows = readTabRows_(cfg._ss, HEALTH_TAB);
  return jsonOk_({ tab: HEALTH_TAB, row_count: rows.data.length, columns: rows.headers, data: rows.data });
}

function handleErrors_(cfg) {
  var rows = readTabRows_(cfg._ss, ERRORS_TAB);
  return jsonOk_({ tab: ERRORS_TAB, row_count: rows.data.length, columns: rows.headers, data: rows.data });
}

function handleTabJson_(cfg, e) {
  var tabName = (e.parameter.name || e.parameter.tab || "").trim();
  if (!tabName) return jsonError_(400, "Missing parameter: name or tab");
  var cacheKey = "tab_json_" + tabName;
  if (cfg.ENABLE_CACHE === "true") {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }
  var rows = readTabRows_(cfg._ss, tabName);
  if (rows === null) return jsonError_(404, "Tab not found: " + tabName);
  var out = JSON.stringify({ tab: tabName, row_count: rows.data.length, columns: rows.headers, data: rows.data });
  if (cfg.ENABLE_CACHE === "true") CacheService.getScriptCache().put(cacheKey, out, cfg._cacheSeconds);
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function handleTabCsv_(cfg, e) {
  var tabName = (e.parameter.tab || e.parameter.name || "").trim();
  if (!tabName) return jsonError_(400, "Missing parameter: tab");
  var cacheKey = "tab_csv_" + tabName;
  if (cfg.ENABLE_CACHE === "true") {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.CSV);
  }
  var ss = cfg._ss;
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return jsonError_(404, "Tab not found: " + tabName);
  var data = sheet.getDataRange().getValues();
  var lines = data.map(function(row) {
    return row.map(function(cell) {
      var v = String(cell);
      if (v.indexOf(",") >= 0 || v.indexOf('"') >= 0 || v.indexOf("\n") >= 0) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    }).join(",");
  });
  var csv = lines.join("\n");
  if (cfg.ENABLE_CACHE === "true") CacheService.getScriptCache().put(cacheKey, csv, cfg._cacheSeconds);
  return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
}

function handleActionPost_(cfg, e, method) {
  if (method !== "POST") return jsonError_(405, "Use POST for /action");
  if (cfg.ALLOW_POST !== "true") return jsonError_(403, "POST is disabled in _settings_bridge");

  var payload = parsePostJson_(e);
  var tabKey = String(payload.tab || payload.action_tab || "").toLowerCase();
  var row = payload.row || payload;

  var tabName;
  var headers;
  if (tabKey === "budget" || tabKey === BUDGET_ACTIONS_TAB) {
    tabName = BUDGET_ACTIONS_TAB;
    headers = BUDGET_ACTION_HEADERS;
  } else if (tabKey === "bid" || tabKey === BID_ACTIONS_TAB) {
    tabName = BID_ACTIONS_TAB;
    headers = BID_ACTION_HEADERS;
  } else {
    return jsonError_(400, "Invalid action tab. Use budget or bid.");
  }

  var required = tabName === BUDGET_ACTIONS_TAB
    ? ["action_id", "customer_id", "campaign_id", "action_type", "target_budget", "approval_status", "approved_by", "approved_at", "status"]
    : ["action_id", "customer_id", "ad_group_id", "criterion_id", "action_type", "target_bid", "approval_status", "approved_by", "approved_at", "status"];
  for (var i = 0; i < required.length; i++) {
    if (!String(row[required[i]] || "").trim()) return jsonError_(400, "Missing action field: " + required[i]);
  }

  if (String(row.approval_status) !== "APPROVED" || String(row.status) !== "APPROVED") {
    return jsonError_(400, "Only APPROVED queue rows may be written through bridge.");
  }

  var sheet = ensureSheetWithHeaders_(cfg._ss, tabName, headers);
  var values = headers.map(function(header) {
    if (header === "created_at" && !row[header]) return new Date().toISOString();
    if (header === "script_version" && !row[header]) return BRIDGE_VER;
    return row[header] === undefined || row[header] === null ? "" : row[header];
  });
  var startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, 1, headers.length).setValues([values]);

  return jsonOk_({ tab: tabName, row: startRow, action_id: row.action_id, status: "queued" });
}

function parsePostJson_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error("Missing JSON body");
  return JSON.parse(e.postData.contents);
}

function readTabRows_(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return null;
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return { headers: [], data: [] };
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h); });
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) row[headers[j]] = data[i][j];
    rows.push(row);
  }
  return { headers: headers, data: rows };
}

function ensureSheetWithHeaders_(ss, tabName, headers) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    var changed = false;
    for (var i = 0; i < headers.length; i++) {
      if (String(existing[i] || "").trim() !== headers[i]) {
        existing[i] = headers[i];
        changed = true;
      }
    }
    if (changed) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function logIfEnabled_(cfg, errorCode, message) {
  if (cfg.LOG_BRIDGE_REQUESTS !== "true") return;
  try {
    var sheet = cfg._ss.getSheetByName("_error_log");
    if (!sheet) return;
    var lastRow = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(lastRow, 1, 1, 7).setValues([["bridge_" + new Date().getTime(), new Date().toISOString(), "WARN", "bridge", errorCode, message, ""]]);
  } catch (e) {}
}

function jsonOk_(data) {
  var out = JSON.stringify({ ok: true, data: data });
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(statusHint, message) {
  var out = JSON.stringify({ ok: false, error: message, status_hint: statusHint });
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}`;
}
