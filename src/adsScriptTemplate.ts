import type { DraftConfig } from './types';

export function buildAdsScript(cfg: DraftConfig): string {
  const now = new Date().toISOString().slice(0, 10);
  return `var SHEET_URL  = "PASTE_GENERATED_SHEET_URL_HERE";
var CFG_TAB    = "_settings_exporter";
var JOBS_TAB   = "_export_jobs";
var HEALTH_TAB = "_script_health";
var RUNS_TAB   = "_sync_runs";
var ERRORS_TAB = "_error_log";

function main() {
  Logger.log("[BitMonitor] เริ่มต้นการทำงานของระบบดึงรายงาน...");

  var ss, cfg, jobs;
  var syncRunId  = "bm_" + new Date().getTime();
  var startedAt  = new Date().toISOString();
  var t0         = new Date().getTime();
  var jobsRun    = 0;
  var totalRows  = 0;
  var errorCount = 0;

  try {
    // โหลดคอนฟิกูเรชันหลักจาก Google Sheet เข้ามาในหน่วยความจำ
    ss   = SpreadsheetApp.openByUrl(SHEET_URL);
    cfg  = readConfig(ss);
    jobs = readExportJobs(ss);
    log_(cfg, "โหลดคอนฟิกสำเร็จ. Environment: " + cfg.environment +
         " | Date mode: " + cfg._dateMode +
         " | รายการงานที่ตรวจพบ: " + jobs.length);
  } catch (e) {
    Logger.log("[BitMonitor] FATAL: ไม่สามารถเปิดหรืออ่านไฟล์ Google Sheet ได้ — " + e.message);
    return;
  }

  // วนลูปประมวลผลงานส่งออกข้อมูล (Export Jobs) ทีละรายการ
  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i];

    // ข้ามงานระบบภายใน (Internal Jobs) ที่ไม่ต้องใช้ GAQL ในการคัดกรองข้อมูล
    if (job.job_key === "raw_sync_runs" ||
        job.job_key === "raw_errors"    ||
        job.job_key === "raw_script_health") {
      continue;
    }

    // ตรวจสอบคอลัมน์ enabled ต้องมีค่าเป็น "true" เท่านั้น
    if (job.enabled !== "true") {
      log_(cfg, "SKIP (enabled=false): " + job.job_key);
      continue;
    }

    // ตรวจสอบคอลัมน์ status ต้องมีสถานะเป็น "active" เท่านั้น
    if (job.status !== "active") {
      log_(cfg, "SKIP (status=" + job.status + "): " + job.job_key);
      continue;
    }

    // ตรวจสอบ Feature Flags ด่านแรกจากแท็บ _settings_exporter 
    if (!isJobAllowedBySettings(job.job_key, cfg)) {
      log_(cfg, "SKIP (สวิตช์ ENABLE_* ถูกปิด): " + job.job_key);
      continue;
    }

    // ตรวจสอบว่ามี Query ฟังก์ชันรองรับงานนี้หรือไม่
    if (!JOB_GAQL[job.job_key]) {
      log_(cfg, "SKIP (ไม่พบฟังก์ชัน GAQL ที่รองรับ): " + job.job_key);
      continue;
    }

    log_(cfg, "กำลังประมวลผล: " + job.job_key + " -> " + job.destination_tab);
    jobsRun++;

    try {
      var maxRows    = getMaxRowsForJob(job, cfg);
      var dateClause = buildDateClause(cfg, job);
      var gaql       = JOB_GAQL[job.job_key](dateClause, maxRows, cfg);

      if (cfg._debug) Logger.log("[BitMonitor] คำสั่ง GAQL: " + gaql.substring(0, 240));

      // ดึงข้อมูลผ่านเครือข่ายและนำไปเขียนลงแท็บเป้าหมาย
      var rows = fetchGaqlRows(gaql, job.job_key, syncRunId);
      writeToTab(ss, job.destination_tab, rows, job.write_mode || "overwrite");
      totalRows += rows.length;
      log_(cfg, "OK: " + job.job_key + " — จำนวน " + rows.length + " แถว -> " + job.destination_tab);
    } catch (e) {
      errorCount++;
      Logger.log("[BitMonitor] FAIL: เกิดข้อผิดพลาดในงาน " + job.job_key + " — " + e.message);
      appendError(ss, syncRunId, job.job_key, e.message);
    }
  }

  // บันทึกรายงานสถานะสุขภาพรอบการทำงานและจัดเก็บ Log หลังบ้าน
  var durationMs = new Date().getTime() - t0;
  appendSyncRun(ss, syncRunId, startedAt, jobsRun, totalRows, errorCount);
  writeScriptHealth(ss, syncRunId, durationMs, errorCount, cfg);
  
  Logger.log("[BitMonitor] เสร็จสิ้นการทำงานทั้งหมด. จำนวนงาน: " + jobsRun +
             " | ปริมาณแถวรวม: " + totalRows +
             " | ข้อผิดพลาดที่เจอ: " + errorCount +
             " | เวลาประมวลผล: " + durationMs + "ms");
}

function isJobAllowedBySettings(jobKey, cfg) {
  if ((jobKey === "raw_pmax_asset_group_daily" || jobKey === "raw_pmax_terms_daily") &&
      cfg.ENABLE_PMAX_EXPORTS === "false") {
    return false;
  }
  if (jobKey === "raw_search_terms_daily" && cfg.ENABLE_SEARCH_TERMS === "false") {
    return false;
  }
  if (jobKey === "raw_geo_daily" && cfg.ENABLE_GEO_EXPORT === "false") {
    return false;
  }
  if (jobKey === "raw_conversion_action_daily" && cfg.ENABLE_CONVERSION_ACTION_EXPORT === "false") {
    return false;
  }
  if (jobKey === "raw_change_history_daily" && cfg.ENABLE_CHANGE_HISTORY_EXPORT === "false") {
    return false;
  }
  return true;
}

function readConfig(ss) {
  var sheet = ss.getSheetByName(CFG_TAB);
  if (!sheet) throw new Error("ไม่พบแท็บตั้งค่าหลัก: " + CFG_TAB);
  var data = sheet.getDataRange().getValues();
  var cfg  = {};
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]).trim();
    var val = String(data[i][1]).trim();
    if (key) cfg[key] = val;
  }
  
  // แปลงชนิดข้อมูลและกำหนดตัวแปรล่วงหน้าเพื่อลดภาระการทำงานภายในลูปหลัก (Optimization)
  cfg._maxRows      = parseInt(cfg.MAX_ROWS       || "5000",  10);
  cfg._maxRowsPmax  = parseInt(cfg.MAX_ROWS_PMAX   || "1000",  10);
  cfg._maxRowsTerms = parseInt(cfg.MAX_ROWS_TERMS  || "10000", 10);
  cfg._lookback     = parseInt(cfg.LOOKBACK_DAYS   || "30",    10);
  cfg._dateMode      = cfg.DATE_RANGE_MODE || "LAST_30_DAYS";
  cfg._debug        = cfg.LOG_LEVEL === "DEBUG";
  cfg._zeroImpr     = cfg.INCLUDE_ZERO_IMPRESSIONS === "true";
  cfg._campaignFilt = cfg.CAMPAIGN_NAME_FILTER || "";
  cfg.environment   = cfg.environment || "unknown";
  return cfg;
}

function readExportJobs(ss) {
  var sheet = ss.getSheetByName(JOBS_TAB);
  if (!sheet) throw new Error("ไม่พบแท็บรายการงานโอนย้ายข้อมูล: " + JOBS_TAB);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var jobs = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0] && !data[i][1]) continue;
    var job = {};
    for (var j = 0; j < headers.length; j++) {
      job[headers[j]] = String(data[i][j] || "");
    }
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
  if (job.job_key === "raw_change_history_daily") {
    return buildChangeDateClause(cfg, job);
  }
  var mode = cfg._dateMode;
  if (mode === "CUSTOM") {
    var lookback = parseInt(job.lookback_days, 10);
    if (isNaN(lookback) || lookback <= 0) lookback = cfg._lookback;
    var now   = new Date();
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
  var now   = new Date();
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
  raw_account_daily: [
    null,
    "segments.date","customer.id","customer.descriptive_name",
    "customer.currency_code","customer.time_zone",
    "metrics.impressions","metrics.clicks","metrics.cost_micros",
    "metrics.conversions","metrics.conversions_value"
  ],
  raw_campaign_daily: [
    null,
    "segments.date","customer.id","campaign.id","campaign.name","campaign.status",
    "campaign.advertising_channel_type","campaign.advertising_channel_sub_type",
    "metrics.impressions","metrics.clicks","metrics.cost_micros",
    "metrics.conversions","metrics.conversions_value"
  ],
  raw_ad_group_daily: [
    null,
    "segments.date","customer.id","campaign.id","campaign.name",
    "ad_group.id","ad_group.name","ad_group.status",
    "metrics.impressions","metrics.clicks","metrics.cost_micros",
    "metrics.conversions","metrics.conversions_value"
  ],
  raw_keyword_daily: [
    null,
    "segments.date","customer.id","campaign.id","campaign.name",
    "ad_group.id","ad_group.name",
    "ad_group_criterion.criterion_id","ad_group_criterion.keyword.text",
    "ad_group_criterion.keyword.match_type","ad_group_criterion.status",
    "ad_group_criterion.quality_info.quality_score",
    "metrics.impressions","metrics.clicks","metrics.cost_micros",
    "metrics.conversions","metrics.conversions_value"
  ],
  raw_search_terms_daily: [
    null,
    "segments.date","customer.id","campaign.id","campaign.name",
    "ad_group.id","ad_group.name",
    "search_term_view.search_term","search_term_view.status",
    "metrics.impressions","metrics.clicks","metrics.cost_micros",
    "metrics.conversions","metrics.conversions_value"
  ],
  raw_pmax_asset_group_daily: [
    null,
    "segments.date","customer.id","campaign.id","campaign.name",
    "asset_group.id","asset_group.name","asset_group.status",
    "metrics.impressions","metrics.clicks","metrics.cost_micros",
    "metrics.conversions","metrics.conversions_value"
  ],
  raw_pmax_terms_daily: [
    null,
    "segments.date","customer.id","campaign.id","campaign.name",
    null,"segments.product_category_level1",
    "metrics.impressions","metrics.clicks","metrics.cost_micros",
    "metrics.conversions","metrics.conversions_value"
  ],
  raw_geo_daily: [
    null,
    "segments.date","customer.id","campaign.id","campaign.name",
    "geographic_view.country_criterion_id",
    "geographic_view.country_criterion_id",
    "geographic_view.location_type",
    "metrics.impressions","metrics.clicks","metrics.cost_micros",
    "metrics.conversions","metrics.conversions_value"
  ],
  raw_device_daily: [
    null,
    "segments.date","customer.id","campaign.id","campaign.name",
    "segments.device",
    "metrics.impressions","metrics.clicks","metrics.cost_micros",
    "metrics.conversions","metrics.conversions_value"
  ],
  raw_conversion_action_daily: [
    null,
    "segments.date","customer.id",
    "segments.conversion_action","segments.conversion_action_name",
    null,null,null,
    "metrics.conversions","metrics.conversions_value"
  ],
  raw_budget_daily: [
    null,
    "segments.date","customer.id","campaign.id","campaign.name",
    "campaign_budget.id","campaign_budget.name",
    "campaign_budget.amount_micros","campaign_budget.delivery_method",
    "metrics.cost_micros",
    null  // ฟิลด์เปอร์เซ็นต์คำนวณสดหลังบ้านที่ดัชนีสุดท้าย
  ],
  raw_change_history_daily: [
    null,
    "change_event.change_date_time","customer.id","change_event.user_email",
    "change_event.change_resource_type","change_event.change_resource_name",
    "change_event.client_type","change_event.changed_fields",
    "change_event.old_resource","change_event.new_resource"
  ]
};

function fetchGaqlRows(gaql, jobKey, syncRunId) {
  var fields = JOB_FIELDS[jobKey];
  if (!fields) throw new Error("ไม่พบอาร์เรย์ Field Map สำหรับคีย์: " + jobKey);

  var rows   = [];
  var report = AdsApp.report(gaql);
  var iter   = report.rows();

  while (iter.hasNext()) {
    var r   = iter.next();
    var row = [];
    for (var i = 0; i < fields.length; i++) {
      if (i === 0) {
        row.push(syncRunId); // ฉีด รหัสรอบตรวจสอบคัดกรอง ลงไปดัชนีแรกสุดเพื่อทำ Audit Trace
      } else if (fields[i] === null) {
        row.push("");  
      } else {
        row.push(r[fields[i]] !== undefined ? r[fields[i]] : "");
      }
    }
    
    // จัดการคำนวณเปอร์เซ็นต์การใช้งานงบประมาณ (Budget Utilization Rate) แบบ Real-time
    if (jobKey === "raw_budget_daily" && row.length > 10) {
      var costMicros   = parseFloat(row[9])  || 0;
      var budgetMicros = parseFloat(row[7])  || 0;
      row[10] = budgetMicros > 0
        ? ((costMicros / budgetMicros) * 100).toFixed(2)
        : "0.00";
    }
    rows.push(row);
  }
  return rows;
}

function writeToTab(ss, tabName, rows, writeMode) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    Logger.log("[BitMonitor] WARNING: ไม่พบแท็บชื่อปลายทางที่ระบุ ข้ามการเขียน: " + tabName);
    return;
  }
  if (rows.length === 0) {
    Logger.log("[BitMonitor] ไม่มีแถวข้อมูลส่งกลับมาจากโครงข่ายสำหรับแท็บ: " + tabName);
    return;
  }

  var colCount = rows[0].length;

  if (writeMode === "append") {
    // หาแถวว่างถัดไปด้านล่างตารางเพื่อบันทึกข้อมูลสะสมต่อเนื่อง
    var lastRow  = sheet.getLastRow();
    var startRow = Math.max(lastRow + 1, 2);
    sheet.getRange(startRow, 1, rows.length, colCount).setValues(rows);
  } else {
    // โหมดเขียนทับ (Overwrite): ล้างเนื้อหาข้อมูลเก่าใต้แถวหัวข้อออกทั้งหมดก่อนบันทึกใหม่
    var lastRowAll = sheet.getLastRow();
    if (lastRowAll > 1) {
      sheet.getRange(2, 1, lastRowAll - 1, Math.max(sheet.getLastColumn(), colCount))
           .clearContent();
    }
    sheet.getRange(2, 1, rows.length, colCount).setValues(rows);
  }
}

function appendSyncRun(ss, syncRunId, startedAt, jobsRun, totalRows, errorCount) {
  try {
    var sheet = ss.getSheetByName(RUNS_TAB);
    if (!sheet) return;
    clearPlaceholder_(sheet, 8);
    var startRow = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(startRow, 1, 1, 8).setValues([[
      syncRunId,
      startedAt,
      new Date().toISOString(),
      errorCount === 0 ? "OK" : "PARTIAL_ERROR",
      jobsRun,
      totalRows,
      errorCount,
      "Google Ads Script"
    ]]);
  } catch (e) {
    Logger.log("[BitMonitor] ไม่สามารถบันทึกประวัติการซิงค์ลงแท็บ _sync_runs: " + e.message);
  }
}

function appendError(ss, syncRunId, jobKey, errorMsg) {
  try {
    var sheet = ss.getSheetByName(ERRORS_TAB);
    if (!sheet) return;
    clearPlaceholder_(sheet, 7);
    var startRow = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(startRow, 1, 1, 7).setValues([[
      syncRunId,
      new Date().toISOString(),
      "ERROR",
      jobKey,
      "",
      String(errorMsg),
      ""
    ]]);
  } catch (e) {
    Logger.log("[BitMonitor] ไม่สามารถเขียนบันทึกปัญหาลงแท็บ _error_log: " + e.message);
  }
}

function writeScriptHealth(ss, syncRunId, durationMs, errorCount, cfg) {
  try {
    var sheet = ss.getSheetByName(HEALTH_TAB);
    if (!sheet) return;
    clearPlaceholder_(sheet, 9);
    var startRow = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(startRow, 1, 1, 9).setValues([[
      syncRunId,
      new Date().toISOString(),
      errorCount === 0 ? "OK" : "ERRORS",
      "${cfg.scriptVersion}",
      durationMs,
      "",
      errorCount,
      cfg.environment || "unknown",
      ""
    ]]);
  } catch (e) {
    Logger.log("[BitMonitor] ไม่สามารถบันทึกรายงานสุขภาพระบบลงแท็บ _script_health: " + e.message);
  }
}

function clearPlaceholder_(sheet, colCount) {
  if (sheet.getLastRow() === 2) {
    var val = String(sheet.getRange(2, 1).getValue());
    if (val.indexOf("auto-populated") >= 0) {
      sheet.getRange(2, 1, 1, colCount).clearContent();
    }
  }
}

function log_(cfg, msg) {
  if (cfg._debug) Logger.log("[BitMonitor] " + msg);
}`;
}
