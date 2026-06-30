import type { DraftConfig } from './types';

export function buildBridgeScript(cfg: DraftConfig): string {
  const now = new Date().toISOString().slice(0, 10);
  return `// ============================================================
// BitMonitor — Apps Script Bridge  v${cfg.scriptVersion}
// Generated: ${now}
// Account:   ${cfg.accountNickname || '(set in _settings_bridge)'}
//
// SETUP:
//   1. In Google Apps Script (script.google.com), create a new project.
//   2. Paste this entire script into the editor.
//   3. Set SHEET_URL below to your generated Google Sheet URL.
//   4. Deploy > New Deployment > Web App:
//        Execute as: Me
//        Who has access: Anyone
//   5. Copy the deployment URL — set it as BRIDGE_ENDPOINT_URL
//      in your _settings_bridge tab.
//   6. NEVER paste a real token in this file.
//      The token is read from _settings_bridge at runtime.
//
// ENDPOINTS (all require ?token=YOUR_TOKEN):
//   ?path=/health            — returns bridge + sheet status
//   ?path=/sync-runs         — returns recent sync run rows
//   ?path=/script-health     — returns script health rows
//   ?path=/errors            — returns recent error log rows
//   ?path=/tab&name=TAB      — returns raw tab data as JSON
//   ?path=/csv&tab=TAB       — returns tab data as CSV text
//   ?path=/json&tab=TAB      — same as /tab but explicit JSON
//
// All config is read from _settings_bridge at runtime.
// ============================================================

var SHEET_URL     = "PASTE_GENERATED_SHEET_URL_HERE";
var CFG_TAB       = "_settings_bridge";
var HEALTH_TAB    = "_script_health";
var RUNS_TAB      = "_sync_runs";
var ERRORS_TAB    = "_error_log";
var BRIDGE_VER    = "${cfg.scriptVersion}";

// ============================================================
// ENTRY POINTS
// ============================================================
function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}

// ============================================================
// REQUEST ROUTER
// ============================================================
function handleRequest_(e) {
  var cfg;
  try {
    cfg = readBridgeConfig_();
  } catch (err) {
    return jsonError_(500, "Cannot open Sheet or read config: " + err.message);
  }

  if (cfg.BRIDGE_ENABLED !== "true") {
    return jsonError_(403, "Bridge is disabled");
  }

  // Token validation — token is read from Sheet at runtime, never hardcoded
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
    return jsonError_(404, "Unknown endpoint. Valid: /health /sync-runs /script-health /errors /tab /json /csv");
  } catch (err) {
    logIfEnabled_(cfg, "RUNTIME_ERROR", String(err.message));
    return jsonError_(500, "Internal error: " + err.message);
  }
}

// ============================================================
// CONFIG — reads key/value from _settings_bridge
// ============================================================
function readBridgeConfig_() {
  var ss    = SpreadsheetApp.openByUrl(SHEET_URL);
  var sheet = ss.getSheetByName(CFG_TAB);
  if (!sheet) throw new Error("Tab not found: " + CFG_TAB);
  var data = sheet.getDataRange().getValues();
  var cfg  = { _ss: ss };
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]).trim();
    var val = String(data[i][1]).trim();
    if (key) cfg[key] = val;
  }
  cfg._cacheSeconds = parseInt(cfg.CACHE_SECONDS || "300", 10);
  if (isNaN(cfg._cacheSeconds) || cfg._cacheSeconds < 0) cfg._cacheSeconds = 300;
  return cfg;
}

// ============================================================
// HANDLERS
// ============================================================
function handleHealth_(cfg) {
  var ss = cfg._ss;
  var lastSync = "";
  try {
    var runsSheet = ss.getSheetByName(RUNS_TAB);
    if (runsSheet && runsSheet.getLastRow() > 1) {
      var lastRow = runsSheet.getLastRow();
      lastSync = String(runsSheet.getRange(lastRow, 2).getValue());
    }
  } catch (e) { /* non-fatal */ }

  return jsonOk_({
    status:       "ok",
    bridge_ver:   BRIDGE_VER,
    sheet_url:    SHEET_URL.substring(0, 60) + "...",
    bridge_enabled: cfg.BRIDGE_ENABLED,
    cache_enabled:  cfg.ENABLE_CACHE,
    last_sync_at:   lastSync,
    timestamp:      new Date().toISOString()
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
    if (cached) return ContentService.createTextOutput(cached)
                       .setMimeType(ContentService.MimeType.JSON);
  }
  var rows = readTabRows_(cfg._ss, tabName);
  if (rows === null) return jsonError_(404, "Tab not found: " + tabName);
  var out = JSON.stringify({ tab: tabName, row_count: rows.data.length, columns: rows.headers, data: rows.data });
  if (cfg.ENABLE_CACHE === "true") {
    CacheService.getScriptCache().put(cacheKey, out, cfg._cacheSeconds);
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function handleTabCsv_(cfg, e) {
  var tabName = (e.parameter.tab || e.parameter.name || "").trim();
  if (!tabName) return jsonError_(400, "Missing parameter: tab");
  var cacheKey = "tab_csv_" + tabName;
  if (cfg.ENABLE_CACHE === "true") {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) return ContentService.createTextOutput(cached)
                       .setMimeType(ContentService.MimeType.CSV);
  }
  var ss    = cfg._ss;
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return jsonError_(404, "Tab not found: " + tabName);
  var data  = sheet.getDataRange().getValues();
  var lines = data.map(function(row) {
    return row.map(function(cell) {
      var v = String(cell);
      if (v.indexOf(",") >= 0 || v.indexOf('"') >= 0 || v.indexOf("\\n") >= 0) {
        v = '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    }).join(",");
  });
  var csv = lines.join("\\n");
  if (cfg.ENABLE_CACHE === "true") {
    CacheService.getScriptCache().put(cacheKey, csv, cfg._cacheSeconds);
  }
  return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
}

// ============================================================
// TAB READER
// Returns { headers: string[], data: object[] } or null if tab missing
// ============================================================
function readTabRows_(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return null;
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return { headers: [], data: [] };
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h); });
  var rows    = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }
  return { headers: headers, data: rows };
}

// ============================================================
// LOGGING
// ============================================================
function logIfEnabled_(cfg, errorCode, message) {
  if (cfg.LOG_BRIDGE_REQUESTS !== "true") return;
  try {
    var ss    = cfg._ss;
    var sheet = ss.getSheetByName("_error_log");
    if (!sheet) return;
    var lastRow  = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(lastRow, 1, 1, 7).setValues([[
      "bridge_" + new Date().getTime(),
      new Date().toISOString(),
      "WARN",
      "bridge",
      errorCode,
      message,
      ""
    ]]);
  } catch (e) { /* non-fatal */ }
}

// ============================================================
// RESPONSE HELPERS
// ============================================================
function jsonOk_(data) {
  var out = JSON.stringify({ ok: true, data: data });
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(statusHint, message) {
  // Apps Script Web Apps always return HTTP 200 — statusHint is informational
  var out = JSON.stringify({ ok: false, error: message, status_hint: statusHint });
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}`;
}
