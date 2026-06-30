import type { DraftConfig } from './types';

export function buildAdsScript(cfg: DraftConfig): string {
  return String.raw`var SHEET_URL  = "PASTE_GENERATED_SHEET_URL_HERE";
var CFG_TAB    = "_settings_exporter";
var JOBS_TAB   = "_export_jobs";
var HEALTH_TAB = "_script_health";
var RUNS_TAB   = "_sync_runs";
var ERRORS_TAB = "_error_log";

var ACTION_CFG_TAB     = "_settings_actions";
var BUDGET_ACTIONS_TAB = "_budget_actions";
var BID_ACTIONS_TAB    = "_bid_actions";
var ACTION_LOG_TAB     = "_action_log";
var SCRIPT_VERSION     = "${cfg.scriptVersion}";

function main() {
  Logger.log("[BitMonitor] Starting Google Ads export + approved action runner...");

  var ss, cfg, jobs;
  var syncRunId  = "bm_" + new Date().getTime();
  var startedAt  = new Date().toISOString();
  var t0         = new Date().getTime();
  var jobsRun    = 0;
  var totalRows  = 0;
  var errorCount = 0;
  var actionStats = emptyActionStats_();

  try {
    ss   = SpreadsheetApp.openByUrl(SHEET_URL);
    cfg  = readConfig(ss);
    jobs = readExportJobs(ss);
    log_(cfg, "Config loaded. Environment: " + cfg.environment +
         " | Date mode: " + cfg._dateMode +
         " | Jobs: " + jobs.length);
  } catch (e) {
    Logger.log("[BitMonitor] FATAL: cannot open or read Google Sheet — " + e.message);
    return;
  }

  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i];

    if (job.job_key === "raw_sync_runs" ||
        job.job_key === "raw_errors" ||
        job.job_key === "raw_script_health") {
      continue;
    }

    if (job.enabled !== "true") {
      log_(cfg, "SKIP enabled=false: " + job.job_key);
      continue;
    }

    if (job.status !== "active") {
      log_(cfg, "SKIP status=" + job.status + ": " + job.job_key);
      continue;
    }

    if (!isJobAllowedBySettings(job.job_key, cfg)) {
      log_(cfg, "SKIP setting disabled: " + job.job_key);
      continue;
    }

    if (!JOB_GAQL[job.job_key]) {
      log_(cfg, "SKIP no GAQL handler: " + job.job_key);
      continue;
    }

    jobsRun++;

    try {
      var maxRows    = getMaxRowsForJob(job, cfg);
      var dateClause = buildDateClause(cfg, job);
      var gaql       = JOB_GAQL[job.job_key](dateClause, maxRows, cfg);

      if (cfg._debug) Logger.log("[BitMonitor] GAQL: " + gaql.substring(0, 240));

      var rows = fetchGaqlRows(gaql, job.job_key, syncRunId);
      writeToTab(ss, job.destination_tab, rows, job.write_mode || "overwrite");
      totalRows += rows.length;
      log_(cfg, "OK: " + job.job_key + " rows=" + rows.length + " -> " + job.destination_tab);
    } catch (e) {
      errorCount++;
      Logger.log("[BitMonitor] FAIL: " + job.job_key + " — " + e.message);
      appendError(ss, syncRunId, job.job_key, e.message);
    }
  }

  try {
    actionStats = processApprovedActions_(ss, cfg, syncRunId);
  } catch (e) {
    actionStats.failed++;
    errorCount++;
    appendError(ss, syncRunId, "action_runner", e.message);
    Logger.log("[BitMonitor] ACTION RUNNER FAIL: " + e.message);
  }

  var durationMs = new Date().getTime() - t0;
  appendSyncRun(ss, syncRunId, startedAt, jobsRun, totalRows, errorCount, actionStats);
  writeScriptHealth(ss, syncRunId, durationMs, errorCount, cfg, actionStats);

  Logger.log("[BitMonitor] Done. jobs=" + jobsRun +
             " rows=" + totalRows +
             " errors=" + errorCount +
             " actions picked=" + actionStats.picked +
             " applied=" + actionStats.applied +
             " dry_run=" + actionStats.dry_run +
             " skipped=" + actionStats.skipped +
             " failed=" + actionStats.failed +
             " duration_ms=" + durationMs);
}

function isJobAllowedBySettings(jobKey, cfg) {
  if ((jobKey === "raw_pmax_asset_group_daily" || jobKey === "raw_pmax_terms_daily") &&
      cfg.ENABLE_PMAX_EXPORTS === "false") return false;
  if (jobKey === "raw_search_terms_daily" && cfg.ENABLE_SEARCH_TERMS === "false") return false;
  if (jobKey === "raw_geo_daily" && cfg.ENABLE_GEO_EXPORT === "false") return false;
  if (jobKey === "raw_conversion_action_daily" && cfg.ENABLE_CONVERSION_ACTION_EXPORT === "false") return false;
  if (jobKey === "raw_change_history_daily" && cfg.ENABLE_CHANGE_HISTORY_EXPORT === "false") return false;
  return true;
}

function readConfig(ss) {
  var sheet = ss.getSheetByName(CFG_TAB);
  if (!sheet) throw new Error("Missing settings tab: " + CFG_TAB);
  var data = sheet.getDataRange().getValues();
  var cfg  = {};
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]).trim();
    var val = String(data[i][1]).trim();
    if (key) cfg[key] = val;
  }

  cfg._maxRows      = parseInt(cfg.MAX_ROWS       || "5000",  10);
  cfg._maxRowsPmax  = parseInt(cfg.MAX_ROWS_PMAX   || "1000",  10);
  cfg._maxRowsTerms = parseInt(cfg.MAX_ROWS_TERMS  || "10000", 10);
  cfg._lookback     = parseInt(cfg.LOOKBACK_DAYS   || "30",    10);
  cfg._dateMode     = cfg.DATE_RANGE_MODE || "LAST_30_DAYS";
  cfg._debug        = cfg.LOG_LEVEL === "DEBUG";
  cfg._zeroImpr     = cfg.INCLUDE_ZERO_IMPRESSIONS === "true";
  cfg._campaignFilt = cfg.CAMPAIGN_NAME_FILTER || "";
  cfg.environment   = cfg.environment || "unknown";
  cfg._customerId   = stripId_(cfg.GOOGLE_ADS_CUSTOMER_ID || "");
  return cfg;
}

function readExportJobs(ss) {
  var sheet = ss.getSheetByName(JOBS_TAB);
  if (!sheet) throw new Error("Missing export jobs tab: " + JOBS_TAB);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var jobs = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0] && !data[i][1]) continue;
    var job = {};
    for (var j = 0; j < headers.length; j++) job[headers[j]] = String(data[i][j] || "");
    jobs.push(job);
  }
  return jobs;
}

function getMaxRowsForJob(job, cfg) {
  var jobMax = parseInt(job.max_rows, 10);
  if (!isNaN(jobMax) && jobMax > 0) return jobMax;

  var k = job.job_key;
  if (k === "raw_pmax_asset_group_daily" || k === "raw_pmax_terms_daily") return cfg._maxRowsPmax;
  if (k === "raw_search_terms_daily") return cfg._maxRowsTerms;
  return cfg._maxRows;
}

function buildDateClause(cfg, job) {
  if (job.job_key === "raw_change_history_daily") return buildChangeDateClause(cfg, job);
  var mode = cfg._dateMode;
  if (mode === "CUSTOM") {
    var lookback = parseInt(job.lookback_days, 10);
    if (isNaN(lookback) || lookback <= 0) lookback = cfg._lookback;
    var now = new Date();
    var start = new Date();
    start.setDate(start.getDate() - lookback);
    return "BETWEEN '" + fmtDate_(start) + "' AND '" + fmtDate_(now) + "'";
  }
  return "DURING " + mode;
}

function buildChangeDateClause(cfg, job) {
  var days = parseInt(job.lookback_days, 10);
  if (isNaN(days) || days <= 0) days = cfg._lookback;
  if (days > 29) days = 29;
  var modeMap = { "LAST_7_DAYS": 7, "LAST_14_DAYS": 14, "LAST_30_DAYS": 30, "YESTERDAY": 1, "TODAY": 0 };
  if (cfg._dateMode !== "CUSTOM" && modeMap[cfg._dateMode] !== undefined) {
    days = modeMap[cfg._dateMode] > 0 ? modeMap[cfg._dateMode] : 1;
  }
  if (days > 29) days = 29;
  var now = new Date();
  var start = new Date();
  start.setDate(start.getDate() - days);
  return ">= '" + fmtDate_(start) + " 00:00:00'" +
         " AND change_event.change_date_time <= '" + fmtDate_(now) + " 23:59:59'";
}

function fmtDate_(d) {
  return Utilities.formatDate(d, "UTC", "yyyy-MM-dd");
}

var JOB_GAQL = {
  raw_account_daily: function(dc, maxRows) {
    return "SELECT customer.id, customer.descriptive_name, customer.currency_code, " +
           "customer.time_zone, segments.date, " +
           "metrics.impressions, metrics.clicks, metrics.cost_micros, " +
           "metrics.conversions, metrics.conversions_value " +
           "FROM customer " +
           "WHERE segments.date " + dc +
           " LIMIT " + maxRows;
  },

  raw_campaign_daily: function(dc, maxRows, cfg) {
    var q = "SELECT customer.id, campaign.id, campaign.name, campaign.status, " +
            "campaign.advertising_channel_type, campaign.advertising_channel_sub_type, " +
            "segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, " +
            "metrics.conversions, metrics.conversions_value " +
            "FROM campaign " +
            "WHERE segments.date " + dc;
    if (!cfg._zeroImpr) q += " AND metrics.impressions > 0";
    if (cfg._campaignFilt) q += " AND campaign.name LIKE '%" + cfg._campaignFilt + "%'";
    return q + " LIMIT " + maxRows;
  },

  raw_ad_group_daily: function(dc, maxRows, cfg) {
    var q = "SELECT customer.id, campaign.id, campaign.name, " +
            "ad_group.id, ad_group.name, ad_group.status, " +
            "segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, " +
            "metrics.conversions, metrics.conversions_value " +
            "FROM ad_group " +
            "WHERE segments.date " + dc;
    if (!cfg._zeroImpr) q += " AND metrics.impressions > 0";
    if (cfg._campaignFilt) q += " AND campaign.name LIKE '%" + cfg._campaignFilt + "%'";
    return q + " LIMIT " + maxRows;
  },

  raw_keyword_daily: function(dc, maxRows, cfg) {
    var q = "SELECT customer.id, campaign.id, campaign.name, ad_group.id, ad_group.name, " +
            "ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, " +
            "ad_group_criterion.keyword.match_type, ad_group_criterion.status, " +
            "ad_group_criterion.quality_info.quality_score, " +
            "segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, " +
            "metrics.conversions, metrics.conversions_value " +
            "FROM keyword_view " +
            "WHERE ad_group_criterion.type = KEYWORD AND segments.date " + dc;
    if (!cfg._zeroImpr) q += " AND metrics.impressions > 0";
    if (cfg._campaignFilt) q += " AND campaign.name LIKE '%" + cfg._campaignFilt + "%'";
    return q + " LIMIT " + maxRows;
  },

  raw_search_terms_daily: function(dc, maxRows, cfg) {
    var q = "SELECT customer.id, campaign.id, campaign.name, ad_group.id, ad_group.name, " +
            "search_term_view.search_term, search_term_view.status, " +
            "segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, " +
            "metrics.conversions, metrics.conversions_value " +
            "FROM search_term_view " +
            "WHERE segments.date " + dc;
    if (cfg._campaignFilt) q += " AND campaign.name LIKE '%" + cfg._campaignFilt + "%'";
    return q + " LIMIT " + maxRows;
  },

  raw_pmax_asset_group_daily: function(dc, maxRows, cfg) {
    var q = "SELECT customer.id, campaign.id, campaign.name, " +
            "asset_group.id, asset_group.name, asset_group.status, " +
            "segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, " +
            "metrics.conversions, metrics.conversions_value " +
            "FROM asset_group " +
            "WHERE campaign.advertising_channel_type = PERFORMANCE_MAX " +
            "AND segments.date " + dc;
    if (cfg._campaignFilt) q += " AND campaign.name LIKE '%" + cfg._campaignFilt + "%'";
    return q + " LIMIT " + maxRows;
  },

  raw_pmax_terms_daily: function(dc, maxRows, cfg) {
    var q = "SELECT customer.id, campaign.id, campaign.name, campaign.advertising_channel_type, " +
            "segments.product_category_level1, " +
            "segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, " +
            "metrics.conversions, metrics.conversions_value " +
            "FROM shopping_performance_view " +
            "WHERE campaign.advertising_channel_type = PERFORMANCE_MAX " +
            "AND segments.date " + dc;
    if (cfg._campaignFilt) q += " AND campaign.name LIKE '%" + cfg._campaignFilt + "%'";
    return q + " LIMIT " + maxRows;
  },

  raw_geo_daily: function(dc, maxRows, cfg) {
    var q = "SELECT customer.id, campaign.id, campaign.name, " +
            "geographic_view.country_criterion_id, geographic_view.location_type, " +
            "segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, " +
            "metrics.conversions, metrics.conversions_value " +
            "FROM geographic_view " +
            "WHERE segments.date " + dc;
    if (cfg._campaignFilt) q += " AND campaign.name LIKE '%" + cfg._campaignFilt + "%'";
    return q + " LIMIT " + maxRows;
  },

  raw_device_daily: function(dc, maxRows, cfg) {
    var q = "SELECT customer.id, campaign.id, campaign.name, segments.device, " +
            "segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, " +
            "metrics.conversions, metrics.conversions_value " +
            "FROM campaign " +
            "WHERE segments.date " + dc;
    if (!cfg._zeroImpr) q += " AND metrics.impressions > 0";
    if (cfg._campaignFilt) q += " AND campaign.name LIKE '%" + cfg._campaignFilt + "%'";
    return q + " LIMIT " + maxRows;
  },

  raw_conversion_action_daily: function(dc, maxRows) {
    return "SELECT customer.id, segments.conversion_action, segments.conversion_action_name, " +
           "segments.date, metrics.conversions, metrics.conversions_value " +
           "FROM customer " +
           "WHERE segments.date " + dc +
           " AND metrics.conversions > 0" +
           " LIMIT " + maxRows;
  },

  raw_budget_daily: function(dc, maxRows, cfg) {
    var q = "SELECT customer.id, campaign.id, campaign.name, " +
            "campaign_budget.id, campaign_budget.name, " +
            "campaign_budget.amount_micros, campaign_budget.delivery_method, " +
            "segments.date, metrics.cost_micros " +
            "FROM campaign " +
            "WHERE segments.date " + dc;
    if (cfg._campaignFilt) q += " AND campaign.name LIKE '%" + cfg._campaignFilt + "%'";
    return q + " LIMIT " + maxRows;
  },

  raw_change_history_daily: function(dc, maxRows) {
    return "SELECT customer.id, change_event.change_date_time, change_event.user_email, " +
           "change_event.change_resource_type, change_event.change_resource_name, " +
           "change_event.client_type, change_event.changed_fields, " +
           "change_event.old_resource, change_event.new_resource " +
           "FROM change_event " +
           "WHERE change_event.change_date_time " + dc +
           " LIMIT " + maxRows;
  }
};

var JOB_FIELDS = {
  raw_account_daily: [null,"segments.date","customer.id","customer.descriptive_name","customer.currency_code","customer.time_zone","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions","metrics.conversions_value"],
  raw_campaign_daily: [null,"segments.date","customer.id","campaign.id","campaign.name","campaign.status","campaign.advertising_channel_type","campaign.advertising_channel_sub_type","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions","metrics.conversions_value"],
  raw_ad_group_daily: [null,"segments.date","customer.id","campaign.id","campaign.name","ad_group.id","ad_group.name","ad_group.status","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions","metrics.conversions_value"],
  raw_keyword_daily: [null,"segments.date","customer.id","campaign.id","campaign.name","ad_group.id","ad_group.name","ad_group_criterion.criterion_id","ad_group_criterion.keyword.text","ad_group_criterion.keyword.match_type","ad_group_criterion.status","ad_group_criterion.quality_info.quality_score","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions","metrics.conversions_value"],
  raw_search_terms_daily: [null,"segments.date","customer.id","campaign.id","campaign.name","ad_group.id","ad_group.name","search_term_view.search_term","search_term_view.status","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions","metrics.conversions_value"],
  raw_pmax_asset_group_daily: [null,"segments.date","customer.id","campaign.id","campaign.name","asset_group.id","asset_group.name","asset_group.status","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions","metrics.conversions_value"],
  raw_pmax_terms_daily: [null,"segments.date","customer.id","campaign.id","campaign.name",null,"segments.product_category_level1","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions","metrics.conversions_value"],
  raw_geo_daily: [null,"segments.date","customer.id","campaign.id","campaign.name","geographic_view.country_criterion_id","geographic_view.country_criterion_id","geographic_view.location_type","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions","metrics.conversions_value"],
  raw_device_daily: [null,"segments.date","customer.id","campaign.id","campaign.name","segments.device","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions","metrics.conversions_value"],
  raw_conversion_action_daily: [null,"segments.date","customer.id","segments.conversion_action","segments.conversion_action_name",null,null,null,"metrics.conversions","metrics.conversions_value"],
  raw_budget_daily: [null,"segments.date","customer.id","campaign.id","campaign.name","campaign_budget.id","campaign_budget.name","campaign_budget.amount_micros","campaign_budget.delivery_method","metrics.cost_micros",null],
  raw_change_history_daily: [null,"change_event.change_date_time","customer.id","change_event.user_email","change_event.change_resource_type","change_event.change_resource_name","change_event.client_type","change_event.changed_fields","change_event.old_resource","change_event.new_resource"]
};

function fetchGaqlRows(gaql, jobKey, syncRunId) {
  var fields = JOB_FIELDS[jobKey];
  if (!fields) throw new Error("Missing field map for key: " + jobKey);

  var rows = [];
  var report = AdsApp.report(gaql);
  var iter = report.rows();

  while (iter.hasNext()) {
    var r = iter.next();
    var row = [];
    for (var i = 0; i < fields.length; i++) {
      if (i === 0) row.push(syncRunId);
      else if (fields[i] === null) row.push("");
      else row.push(r[fields[i]] !== undefined ? r[fields[i]] : "");
    }

    if (jobKey === "raw_budget_daily" && row.length > 10) {
      var costMicros   = parseFloat(row[9]) || 0;
      var budgetMicros = parseFloat(row[7]) || 0;
      row[10] = budgetMicros > 0 ? ((costMicros / budgetMicros) * 100).toFixed(2) : "0.00";
    }
    rows.push(row);
  }
  return rows;
}

function writeToTab(ss, tabName, rows, writeMode) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    Logger.log("[BitMonitor] WARNING: missing destination tab, skipping: " + tabName);
    return;
  }
  if (rows.length === 0) {
    Logger.log("[BitMonitor] No rows returned for tab: " + tabName);
    return;
  }

  var colCount = rows[0].length;
  if (writeMode === "append") {
    var lastRow = sheet.getLastRow();
    var startRow = Math.max(lastRow + 1, 2);
    sheet.getRange(startRow, 1, rows.length, colCount).setValues(rows);
  } else {
    var lastRowAll = sheet.getLastRow();
    if (lastRowAll > 1) sheet.getRange(2, 1, lastRowAll - 1, Math.max(sheet.getLastColumn(), colCount)).clearContent();
    sheet.getRange(2, 1, rows.length, colCount).setValues(rows);
  }
}

var BUDGET_ACTION_HEADERS = ["action_id","created_at","account_id","customer_id","campaign_id","campaign_name","action_type","expected_current_budget","target_budget","max_change_pct","currency","reason","evidence","approval_status","approved_by","approved_at","status","picked_at","applied_at","result","message","script_version","last_checked_current_budget","rollback_budget"];
var BID_ACTION_HEADERS = ["action_id","created_at","account_id","customer_id","campaign_id","ad_group_id","criterion_id","entity_level","entity_name","action_type","expected_current_bid","target_bid","min_bid","max_bid","max_change_pct","reason","approval_status","approved_by","approved_at","status","picked_at","applied_at","result","message","script_version","last_checked_current_bid","rollback_bid"];
var ACTION_LOG_HEADERS = ["log_id","action_id","action_tab","logged_at","account_id","customer_id","campaign_id","entity_level","action_type","old_value","new_value","result","message","script_version","sync_run_id"];

function emptyActionStats_() {
  return { picked: 0, applied: 0, dry_run: 0, skipped: 0, failed: 0 };
}

function processApprovedActions_(ss, cfg, syncRunId) {
  var stats = emptyActionStats_();
  var acfg = readKeyValueTab_(ss, ACTION_CFG_TAB);
  if (!acfg.ACTION_RUNNER_ENABLED) return stats;

  ensureSheetWithHeaders_(ss, BUDGET_ACTIONS_TAB, BUDGET_ACTION_HEADERS);
  ensureSheetWithHeaders_(ss, BID_ACTIONS_TAB, BID_ACTION_HEADERS);
  ensureSheetWithHeaders_(ss, ACTION_LOG_TAB, ACTION_LOG_HEADERS);

  if (acfg.ACTION_RUNNER_ENABLED !== "true") return stats;

  var mode = acfg.ACTION_EXECUTION_MODE || "review_only";
  if (mode === "disabled" || mode === "review_only") return stats;

  var canMutate = mode === "manual_apply_via_script" && acfg.GOOGLE_ADS_SCRIPT_CAN_MUTATE === "true";
  var maxActions = parseInt(acfg.MAX_ACTIONS_PER_RUN || "10", 10);
  if (isNaN(maxActions) || maxActions <= 0) maxActions = 10;

  processBudgetActions_(ss, cfg, acfg, syncRunId, stats, canMutate, maxActions);
  if (stats.picked < maxActions) processBidActions_(ss, cfg, acfg, syncRunId, stats, canMutate, maxActions);
  return stats;
}

function processBudgetActions_(ss, cfg, acfg, syncRunId, stats, canMutate, maxActions) {
  var sheet = ensureSheetWithHeaders_(ss, BUDGET_ACTIONS_TAB, BUDGET_ACTION_HEADERS);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  var h = headerMap_(data[0]);

  for (var r = 1; r < data.length && stats.picked < maxActions; r++) {
    var row = rowObject_(data[r], h);
    if (!isApprovedReady_(row)) continue;

    stats.picked++;
    var now = new Date().toISOString();
    setCell_(sheet, r + 1, h, "status", "PICKED");
    setCell_(sheet, r + 1, h, "picked_at", now);

    var result = "SKIPPED";
    var message = "";
    var current = null;
    var target = parseMoney_(row.target_budget);
    var expected = parseMoney_(row.expected_current_budget);
    var actionId = value_(row.action_id) || ("budget_" + new Date().getTime() + "_" + r);

    try {
      if (value_(row.action_type) !== "SET_BUDGET") throw new Error("Unsupported budget action: " + row.action_type);
      validateAccount_(row, cfg);
      requireApproval_(row);
      var campaign = findCampaignById_(row.campaign_id);
      if (!campaign) throw new Error("Campaign not found: " + row.campaign_id);
      var budget = campaign.getBudget();
      current = Number(budget.getAmount());
      validateExpected_("budget", current, expected, acfg);
      validateChangePct_(current, target, Number(row.max_change_pct || acfg.MAX_BUDGET_CHANGE_PCT || "10"));
      if (isSharedBudget_(budget) && acfg.ALLOW_SHARED_BUDGETS !== "true") {
        result = "SKIPPED";
        message = "Shared budget skipped by guardrail.";
      } else if (!canMutate) {
        result = "DRY_RUN";
        message = "Dry run only. Set ACTION_EXECUTION_MODE=manual_apply_via_script and GOOGLE_ADS_SCRIPT_CAN_MUTATE=true to mutate.";
      } else {
        budget.setAmount(target);
        result = "APPLIED";
        message = "Budget changed from " + current + " to " + target;
      }
    } catch (e) {
      result = "FAILED";
      message = e.message;
    }

    finalizeActionRow_(ss, sheet, r + 1, h, stats, { actionId: actionId, actionTab: BUDGET_ACTIONS_TAB, accountId: row.account_id, customerId: row.customer_id, campaignId: row.campaign_id, entityLevel: "campaign", actionType: row.action_type, oldValue: current, newValue: target, result: result, message: message, scriptVersion: SCRIPT_VERSION, syncRunId: syncRunId, currentField: "last_checked_current_budget", rollbackField: "rollback_budget" });
  }
}

function processBidActions_(ss, cfg, acfg, syncRunId, stats, canMutate, maxActions) {
  var sheet = ensureSheetWithHeaders_(ss, BID_ACTIONS_TAB, BID_ACTION_HEADERS);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  var h = headerMap_(data[0]);

  for (var r = 1; r < data.length && stats.picked < maxActions; r++) {
    var row = rowObject_(data[r], h);
    if (!isApprovedReady_(row)) continue;

    stats.picked++;
    var now = new Date().toISOString();
    setCell_(sheet, r + 1, h, "status", "PICKED");
    setCell_(sheet, r + 1, h, "picked_at", now);

    var result = "SKIPPED";
    var message = "";
    var current = null;
    var target = parseMoney_(row.target_bid);
    var expected = parseMoney_(row.expected_current_bid);
    var entityLevel = value_(row.entity_level) || "keyword";
    var actionId = value_(row.action_id) || ("bid_" + new Date().getTime() + "_" + r);

    try {
      if (value_(row.action_type) !== "SET_KEYWORD_CPC" && value_(row.action_type) !== "SET_ADGROUP_CPC") throw new Error("Unsupported bid action: " + row.action_type);
      validateAccount_(row, cfg);
      requireApproval_(row);
      var minBid = parseMoney_(row.min_bid || acfg.MIN_BID || "0.01");
      var maxBid = parseMoney_(row.max_bid || acfg.MAX_BID || "2");
      if (target < minBid || target > maxBid) throw new Error("Target bid outside min/max guardrail.");
      if (value_(row.action_type) === "SET_ADGROUP_CPC") {
        var adGroup = findAdGroupById_(row.ad_group_id);
        if (!adGroup) throw new Error("Ad group not found: " + row.ad_group_id);
        current = Number(adGroup.bidding().getCpc());
        validateExpected_("bid", current, expected, acfg);
        validateChangePct_(current, target, Number(row.max_change_pct || acfg.MAX_BID_CHANGE_PCT || "25"));
        if (!canMutate) { result = "DRY_RUN"; message = "Dry run only. Mutate switch is closed."; }
        else { adGroup.bidding().setCpc(target); result = "APPLIED"; message = "Ad group CPC changed from " + current + " to " + target; }
      } else {
        var keyword = findKeywordByIds_(row.ad_group_id, row.criterion_id);
        if (!keyword) throw new Error("Keyword not found: ad_group_id=" + row.ad_group_id + " criterion_id=" + row.criterion_id);
        current = Number(keyword.bidding().getCpc());
        validateExpected_("bid", current, expected, acfg);
        validateChangePct_(current, target, Number(row.max_change_pct || acfg.MAX_BID_CHANGE_PCT || "25"));
        if (!canMutate) { result = "DRY_RUN"; message = "Dry run only. Mutate switch is closed."; }
        else { keyword.bidding().setCpc(target); result = "APPLIED"; message = "Keyword CPC changed from " + current + " to " + target; }
      }
    } catch (e) {
      result = "FAILED";
      message = e.message;
    }

    finalizeActionRow_(ss, sheet, r + 1, h, stats, { actionId: actionId, actionTab: BID_ACTIONS_TAB, accountId: row.account_id, customerId: row.customer_id, campaignId: row.campaign_id, entityLevel: entityLevel, actionType: row.action_type, oldValue: current, newValue: target, result: result, message: message, scriptVersion: SCRIPT_VERSION, syncRunId: syncRunId, currentField: "last_checked_current_bid", rollbackField: "rollback_bid" });
  }
}

function isApprovedReady_(row) {
  var status = value_(row.status);
  var approval = value_(row.approval_status);
  return approval === "APPROVED" && (status === "APPROVED" || status === "READY" || status === "");
}
function requireApproval_(row) { if (value_(row.approval_status) !== "APPROVED") throw new Error("approval_status must be APPROVED"); if (!value_(row.approved_by)) throw new Error("approved_by is required"); if (!value_(row.approved_at)) throw new Error("approved_at is required"); }
function validateAccount_(row, cfg) { var rowCustomer = stripId_(row.customer_id || row.account_id || ""); if (cfg._customerId && rowCustomer && rowCustomer !== cfg._customerId) throw new Error("Customer ID mismatch. Row=" + rowCustomer + " script=" + cfg._customerId); }
function validateExpected_(label, current, expected, acfg) { if (!expected || expected <= 0) return; var tolerance = parseFloat(acfg.EXPECTED_VALUE_TOLERANCE || "0.01"); if (isNaN(tolerance) || tolerance < 0) tolerance = 0.01; if (Math.abs(current - expected) > tolerance) throw new Error("Expected current " + label + " mismatch. expected=" + expected + " current=" + current); }
function validateChangePct_(current, target, maxPct) { if (!current || current <= 0) return; if (isNaN(maxPct) || maxPct <= 0) maxPct = 10; var pct = Math.abs((target - current) / current) * 100; if (pct > maxPct) throw new Error("Change " + pct.toFixed(2) + "% exceeds max " + maxPct + "%"); }

function findCampaignById_(campaignId) { var id = Number(campaignId); if (!id) return null; var selectorNames = ["campaigns", "shoppingCampaigns", "videoCampaigns", "performanceMaxCampaigns"]; for (var i = 0; i < selectorNames.length; i++) { var name = selectorNames[i]; try { if (typeof AdsApp[name] !== "function") continue; var it = AdsApp[name]().withIds([id]).get(); if (it.hasNext()) return it.next(); } catch (e) {} } return null; }
function findAdGroupById_(adGroupId) { var id = Number(adGroupId); if (!id) return null; try { var it = AdsApp.adGroups().withIds([id]).get(); if (it.hasNext()) return it.next(); } catch (e) {} return null; }
function findKeywordByIds_(adGroupId, criterionId) { var agid = Number(adGroupId); var kid = Number(criterionId); if (!agid || !kid) return null; try { var it = AdsApp.keywords().withIds([[agid, kid]]).get(); if (it.hasNext()) return it.next(); } catch (e) {} return null; }
function isSharedBudget_(budget) { try { if (typeof budget.isExplicitlyShared === "function") return budget.isExplicitlyShared(); } catch (e) {} return false; }

function finalizeActionRow_(ss, sheet, rowNumber, h, stats, item) {
  var now = new Date().toISOString();
  setCell_(sheet, rowNumber, h, "status", item.result);
  setCell_(sheet, rowNumber, h, "applied_at", now);
  setCell_(sheet, rowNumber, h, "result", item.result);
  setCell_(sheet, rowNumber, h, "message", item.message);
  setCell_(sheet, rowNumber, h, "script_version", item.scriptVersion);
  setCell_(sheet, rowNumber, h, item.currentField, item.oldValue === null ? "" : item.oldValue);
  setCell_(sheet, rowNumber, h, item.rollbackField, item.oldValue === null ? "" : item.oldValue);
  if (item.result === "APPLIED") stats.applied++; else if (item.result === "DRY_RUN") stats.dry_run++; else if (item.result === "FAILED") stats.failed++; else stats.skipped++;
  appendActionLog_(ss, item);
}

function appendActionLog_(ss, item) {
  var sheet = ensureSheetWithHeaders_(ss, ACTION_LOG_TAB, ACTION_LOG_HEADERS);
  var row = ["log_" + new Date().getTime(), item.actionId, item.actionTab, new Date().toISOString(), item.accountId || "", item.customerId || "", item.campaignId || "", item.entityLevel || "", item.actionType || "", item.oldValue === null ? "" : item.oldValue, item.newValue === null ? "" : item.newValue, item.result, item.message, item.scriptVersion, item.syncRunId];
  sheet.getRange(Math.max(sheet.getLastRow() + 1, 2), 1, 1, row.length).setValues([row]);
}

function readKeyValueTab_(ss, tabName) { var sheet = ss.getSheetByName(tabName); if (!sheet) return {}; var data = sheet.getDataRange().getValues(); var obj = {}; for (var i = 1; i < data.length; i++) { var key = String(data[i][0] || "").trim(); if (key) obj[key] = String(data[i][1] || "").trim(); } return obj; }
function ensureSheetWithHeaders_(ss, tabName, headers) { var sheet = ss.getSheetByName(tabName); if (!sheet) sheet = ss.insertSheet(tabName); if (sheet.getLastRow() < 1) { sheet.getRange(1, 1, 1, headers.length).setValues([headers]); } else { var existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0]; var changed = false; for (var i = 0; i < headers.length; i++) { if (String(existing[i] || "").trim() !== headers[i]) { existing[i] = headers[i]; changed = true; } } if (changed) sheet.getRange(1, 1, 1, headers.length).setValues([headers]); } return sheet; }
function headerMap_(headers) { var map = {}; for (var i = 0; i < headers.length; i++) map[String(headers[i]).trim()] = i + 1; return map; }
function rowObject_(row, h) { var obj = {}; for (var key in h) obj[key] = row[h[key] - 1]; return obj; }
function setCell_(sheet, rowNumber, h, key, value) { if (!h[key]) return; sheet.getRange(rowNumber, h[key]).setValue(value); }
function value_(v) { return String(v === null || v === undefined ? "" : v).trim(); }
function parseMoney_(v) { var n = parseFloat(String(v === null || v === undefined ? "" : v).replace(/,/g, "")); return isNaN(n) ? 0 : n; }
function stripId_(v) { return String(v || "").replace(/[^0-9]/g, ""); }

function appendSyncRun(ss, syncRunId, startedAt, jobsRun, totalRows, errorCount, actionStats) {
  try { var sheet = ss.getSheetByName(RUNS_TAB); if (!sheet) return; clearPlaceholder_(sheet, 8); var startRow = Math.max(sheet.getLastRow() + 1, 2); sheet.getRange(startRow, 1, 1, 8).setValues([[syncRunId, startedAt, new Date().toISOString(), errorCount === 0 ? "OK" : "PARTIAL_ERROR", jobsRun, totalRows, errorCount, "Google Ads Script | actions picked=" + actionStats.picked + " applied=" + actionStats.applied + " dry_run=" + actionStats.dry_run]]); } catch (e) { Logger.log("[BitMonitor] Cannot append _sync_runs: " + e.message); }
}

function appendError(ss, syncRunId, jobKey, errorMsg) {
  try { var sheet = ss.getSheetByName(ERRORS_TAB); if (!sheet) return; clearPlaceholder_(sheet, 7); var startRow = Math.max(sheet.getLastRow() + 1, 2); sheet.getRange(startRow, 1, 1, 7).setValues([[syncRunId, new Date().toISOString(), "ERROR", jobKey, "", String(errorMsg), ""]]); } catch (e) { Logger.log("[BitMonitor] Cannot append _error_log: " + e.message); }
}

function writeScriptHealth(ss, syncRunId, durationMs, errorCount, cfg, actionStats) {
  try { var sheet = ss.getSheetByName(HEALTH_TAB); if (!sheet) return; clearPlaceholder_(sheet, 9); var startRow = Math.max(sheet.getLastRow() + 1, 2); sheet.getRange(startRow, 1, 1, 9).setValues([[syncRunId, new Date().toISOString(), errorCount === 0 ? "OK" : "ERRORS", SCRIPT_VERSION, durationMs, "", errorCount, cfg.environment || "unknown", "actions picked=" + actionStats.picked + " applied=" + actionStats.applied + " dry_run=" + actionStats.dry_run + " skipped=" + actionStats.skipped + " failed=" + actionStats.failed]]); } catch (e) { Logger.log("[BitMonitor] Cannot append _script_health: " + e.message); }
}

function clearPlaceholder_(sheet, colCount) { if (sheet.getLastRow() === 2) { var val = String(sheet.getRange(2, 1).getValue()); if (val.indexOf("auto-populated") >= 0) sheet.getRange(2, 1, 1, colCount).clearContent(); } }
function log_(cfg, msg) { if (cfg._debug) Logger.log("[BitMonitor] " + msg); }`;
}
