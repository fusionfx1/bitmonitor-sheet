import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { DraftConfig } from './types';
import { SHEET_TABS } from './constants';

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function makeSheet(rows: unknown[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  // Set reasonable column widths
  const maxCols = Math.max(...rows.map(r => r.length));
  ws['!cols'] = Array.from({ length: maxCols }, (_, i) => {
    const maxLen = Math.max(
      ...rows.map(r => String(r[i] ?? '').length),
      8,
    );
    return { wch: Math.min(maxLen + 2, 60) };
  });
  return ws;
}

function readmeRows(cfg: DraftConfig): unknown[][] {
  const now = new Date().toISOString();
  return [
    ['BitMonitor Sheet Generator - README'],
    [],
    ['Project Name', cfg.dashboardProjectName || 'BitMonitor'],
    ['Account Nickname', cfg.accountNickname],
    ['Customer ID', cfg.customerId],
    ['Environment', cfg.environment.toUpperCase()],
    ['Template Type', cfg.templateType],
    ['Generated At', now],
    ['Sheet Version', cfg.sheetVersion],
    ['Script Version', cfg.scriptVersion],
    ['Ads API Version', cfg.adsApiVersion],
    ['Owner Email', cfg.ownerEmail],
    [],
    ['--- ISOLATION WARNING ---'],
    ['This Sheet is ISOLATED per Google Ads account.'],
    ['Do NOT share this Sheet across multiple accounts.'],
    ['Do NOT grant access to users from other accounts.'],
    ['1 Google Ads Account = 1 Sheet'],
    [],
    ['--- DEPLOYMENT STEPS ---'],
    ['1. Create a new Google Sheet in the account owner\'s Drive.'],
    ['2. Copy the content of each tab from this XLSX into the corresponding Google Sheet tab.'],
    ['3. In Google Ads Script editor, paste the SHEET_URL constant pointing to this Sheet.'],
    ['4. Set CONFIG_TAB = "_settings_exporter" in the script.'],
    ['5. Authorize the script under the correct Google Ads account.'],
    ['6. Test with environment = test before switching to production.'],
    [],
    ['--- SCRIPT SETUP CHECKLIST ---'],
    ['[ ] Sheet created in correct account Drive'],
    ['[ ] SHEET_URL set in Google Ads Script'],
    ['[ ] _settings_exporter populated correctly'],
    ['[ ] _settings_bridge populated if bridge enabled'],
    ['[ ] _export_jobs enabled/disabled as needed'],
    ['[ ] Test run completed with no errors'],
    ['[ ] _script_health tab shows green status'],
    ['[ ] Production switch approved'],
  ];
}

function settingsGlobalRows(cfg: DraftConfig): unknown[][] {
  const now = new Date().toISOString();
  return [
    ['key', 'value', 'type', 'required', 'description'],
    ['project_name', cfg.dashboardProjectName || 'BitMonitor', 'string', 'true', 'Project display name'],
    ['account_id', cfg.accountId || cfg.customerId, 'string', 'true', 'Internal account identifier'],
    ['customer_id', cfg.customerId, 'string', 'true', 'Google Ads Customer ID'],
    ['account_name', cfg.accountNickname, 'string', 'true', 'Human-readable account name'],
    ['timezone', cfg.timezone, 'string', 'true', 'Account timezone'],
    ['currency', cfg.currency, 'string', 'true', 'Account currency code'],
    ['environment', cfg.environment, 'string', 'true', 'Deployment environment: test | staging | production'],
    ['sheet_version', cfg.sheetVersion, 'string', 'true', 'Sheet template version'],
    ['script_version', cfg.scriptVersion, 'string', 'true', 'Google Ads Script version'],
    ['ads_api_version', cfg.adsApiVersion, 'string', 'true', 'Google Ads API version'],
    ['generated_at', now, 'string', 'false', 'ISO timestamp when this sheet was generated'],
    ['owner_email', cfg.ownerEmail, 'string', 'true', 'Sheet owner email'],
    ['enable_debug_logs', fmt(cfg.enableDebugLogs), 'boolean', 'false', 'Enable verbose debug logging'],
    ['default_lookback_days', fmt(cfg.lookbackDays), 'number', 'true', 'Default data lookback window in days'],
    ['default_max_rows', fmt(cfg.maxRowsDefault), 'number', 'true', 'Default max rows per export job'],
    ['default_write_mode', cfg.writeMode, 'string', 'true', 'Default write mode: append | overwrite | upsert'],
    ['dashboard_enabled', fmt(cfg.dashboardEnabled), 'boolean', 'false', 'Enable dashboard integration'],
    ['bridge_enabled', fmt(cfg.bridgeEnabled), 'boolean', 'false', 'Enable Apps Script bridge'],
    ['google_ads_exporter_enabled', 'true', 'boolean', 'true', 'Enable Google Ads data exporter'],
  ];
}

function settingsAccountRows(cfg: DraftConfig): unknown[][] {
  const rows: unknown[][] = [
    ['key', 'value', 'type', 'required', 'description'],
    ['account_nickname', cfg.accountNickname, 'string', 'true', 'Short nickname for this account'],
    ['customer_id', cfg.customerId, 'string', 'true', 'Google Ads Customer ID (no dashes)'],
    ['timezone', cfg.timezone, 'string', 'true', 'Account timezone string'],
    ['currency', cfg.currency, 'string', 'true', 'ISO currency code'],
    ['environment', cfg.environment, 'string', 'true', 'test | staging | production'],
    ['owner_email', cfg.ownerEmail, 'string', 'true', 'Owner email for access tracking'],
    ['export_schedule_note', cfg.exportScheduleNote, 'string', 'false', 'Human note about export schedule'],
    ['template_type', cfg.templateType, 'string', 'true', 'Sheet template type used'],
    ['is_mcc_child_account', fmt(cfg.isMccChildAccount ?? false), 'boolean', 'false', 'True if this is a child account under an MCC'],
    ['mcc_parent_customer_id', cfg.mccParentCustomerId ?? '', 'string', 'false', 'MCC Manager account Customer ID (if is_mcc_child_account = true)'],
  ];
  return rows;
}

function settingsExporterRows(cfg: DraftConfig): unknown[][] {
  return [
    ['key', 'value', 'type', 'required', 'description'],
    ['GOOGLE_ADS_CUSTOMER_ID', cfg.customerId, 'string', 'true', 'Google Ads Customer ID for this account'],
    ['DATE_RANGE_MODE', cfg.dateRangeMode, 'string', 'true', 'TODAY | YESTERDAY | LAST_7_DAYS | LAST_14_DAYS | LAST_30_DAYS | CUSTOM'],
    ['LOOKBACK_DAYS', fmt(cfg.lookbackDays), 'number', 'true', 'Days to look back for data (used when DATE_RANGE_MODE=CUSTOM)'],
    ['MAX_ROWS', fmt(cfg.maxRowsDefault), 'number', 'true', 'Default maximum rows per export'],
    ['MAX_ROWS_PMAX', fmt(cfg.maxRowsPmax), 'number', 'true', 'Max rows for PMax exports'],
    ['MAX_ROWS_TERMS', fmt(cfg.maxRowsTerms), 'number', 'true', 'Max rows for search terms exports'],
    ['WRITE_MODE', cfg.writeMode, 'string', 'true', 'append | overwrite | upsert'],
    ['CLEAR_BEFORE_WRITE', fmt(cfg.writeMode === 'overwrite'), 'boolean', 'false', 'Clear destination tab before writing'],
    ['APPEND_SYNC_RUN_ID', 'true', 'boolean', 'false', 'Append sync_run_id column to each row'],
    ['INCLUDE_ZERO_IMPRESSIONS', fmt(cfg.includeZeroImpressions), 'boolean', 'false', 'Include rows with zero impressions'],
    ['INCLUDE_REMOVED_ENTITIES', fmt(cfg.includeRemovedEntities), 'boolean', 'false', 'Include removed campaigns/ad groups/keywords'],
    ['ENABLE_PMAX_EXPORTS', fmt(cfg.exportFunctions.find(f => f.function_key === 'raw_pmax_asset_group_daily')?.enabled ?? true), 'boolean', 'false', 'Enable Performance Max asset group exports'],
    ['ENABLE_SEARCH_TERMS', fmt(cfg.exportFunctions.find(f => f.function_key === 'raw_search_terms_daily')?.enabled ?? true), 'boolean', 'false', 'Enable search terms export'],
    ['ENABLE_GEO_EXPORT', fmt(cfg.exportFunctions.find(f => f.function_key === 'raw_geo_daily')?.enabled ?? true), 'boolean', 'false', 'Enable geographic view export'],
    ['ENABLE_CONVERSION_ACTION_EXPORT', fmt(cfg.exportFunctions.find(f => f.function_key === 'raw_conversion_action_daily')?.enabled ?? true), 'boolean', 'false', 'Enable conversion action export'],
    ['ENABLE_CHANGE_HISTORY_EXPORT', fmt(cfg.exportFunctions.find(f => f.function_key === 'raw_change_history_daily')?.enabled ?? true), 'boolean', 'false', 'Enable change history export'],
    ['LOG_LEVEL', cfg.enableDebugLogs ? 'DEBUG' : 'INFO', 'string', 'false', 'DEBUG | INFO | WARN | ERROR'],
  ];
}

function settingsBridgeRows(cfg: DraftConfig): unknown[][] {
  return [
    ['key', 'value', 'type', 'required', 'description'],
    ['BRIDGE_ENABLED', fmt(cfg.bridgeEnabled), 'boolean', 'true', 'Enable the Apps Script bridge'],
    ['BRIDGE_TOKEN_PLACEHOLDER', cfg.bridgeTokenPlaceholder, 'string', 'true', 'Placeholder token — replace with your own secure token'],
    ['BRIDGE_ENDPOINT_URL', cfg.bridgeEndpointUrl, 'string', 'true', 'Apps Script web app deployment URL'],
    ['DASHBOARD_IMPORT_MODE', cfg.dashboardImportMode, 'string', 'true', 'pull | push'],
    ['ALLOW_GET', fmt(cfg.allowGet), 'boolean', 'false', 'Allow GET requests on bridge endpoint'],
    ['ALLOW_POST', fmt(cfg.allowPost), 'boolean', 'false', 'Allow POST requests on bridge endpoint'],
    ['ENABLE_HEALTH_ENDPOINT', fmt(cfg.enableHealthEndpoint), 'boolean', 'false', 'Enable /health status endpoint'],
    ['ENABLE_CSV_EXPORT', fmt(cfg.enableCsvExport), 'boolean', 'false', 'Enable CSV export via bridge'],
    ['ENABLE_JSON_EXPORT', fmt(cfg.enableJsonExport), 'boolean', 'false', 'Enable JSON export via bridge'],
    ['ENABLE_CACHE', fmt(cfg.enableCache), 'boolean', 'false', 'Enable response caching'],
    ['CACHE_SECONDS', fmt(cfg.cacheSeconds), 'number', 'false', 'Cache TTL in seconds'],
    ['LOG_BRIDGE_REQUESTS', fmt(cfg.logBridgeRequests), 'boolean', 'false', 'Log all bridge requests to _error_log'],
  ];
}

function settingsDashboardRows(cfg: DraftConfig): unknown[][] {
  return [
    ['key', 'value', 'type', 'required', 'description'],
    ['DASHBOARD_ENABLED', fmt(cfg.dashboardEnabled), 'boolean', 'true', 'Enable dashboard data views'],
    ['DASHBOARD_ACCOUNT_NAME', cfg.dashboardAccountName || cfg.accountNickname, 'string', 'true', 'Account name shown in dashboard'],
    ['DASHBOARD_REFRESH_INTERVAL_MINUTES', fmt(cfg.dashboardRefreshIntervalMinutes), 'number', 'false', 'How often dashboard refreshes data'],
    ['SHOW_LAST_SYNC_CARD', fmt(cfg.showLastSyncCard), 'boolean', 'false', 'Show last sync status card'],
    ['SHOW_SCRIPT_HEALTH_CARD', fmt(cfg.showScriptHealthCard), 'boolean', 'false', 'Show script health status card'],
    ['SHOW_CAMPAIGN_TABLE', fmt(cfg.showCampaignTable), 'boolean', 'false', 'Show campaign performance table'],
    ['SHOW_PMAX_TABLE', fmt(cfg.showPmaxTable), 'boolean', 'false', 'Show PMax table'],
    ['SHOW_SEARCH_TERMS_TABLE', fmt(cfg.showSearchTermsTable), 'boolean', 'false', 'Show search terms table'],
    ['SHOW_GEO_TABLE', fmt(cfg.showGeoTable), 'boolean', 'false', 'Show geographic table'],
    ['SHOW_CONVERSION_TABLE', fmt(cfg.showConversionTable), 'boolean', 'false', 'Show conversions table'],
    ['ALERT_IF_SYNC_OLDER_THAN_HOURS', fmt(cfg.alertIfSyncOlderThanHours), 'number', 'false', 'Alert if last sync is older than N hours'],
    ['ALERT_IF_SCRIPT_ERROR_COUNT_GT', fmt(cfg.alertIfScriptErrorCountGt), 'number', 'false', 'Alert if error count exceeds this threshold'],
    ['ALERT_IF_COST_SPIKE_PERCENT_GT', fmt(cfg.alertIfCostSpikePercentGt), 'number', 'false', 'Alert if cost spikes by this % vs prior period'],
    ['ALERT_IF_CONVERSION_DROP_PERCENT_GT', fmt(cfg.alertIfConversionDropPercentGt), 'number', 'false', 'Alert if conversions drop by this % vs prior period'],
  ];
}

function exportJobsRows(cfg: DraftConfig): unknown[][] {
  const header = [
    'enabled', 'job_key', 'destination_tab', 'resource_name', 'date_grain',
    'lookback_days', 'max_rows', 'write_mode', 'requires_gaql', 'safe_resource_notes',
    'status', 'last_run_at', 'last_rows_written', 'last_error',
  ];
  const rows: unknown[][] = [header];
  for (const fn of cfg.exportFunctions) {
    rows.push([
      fmt(fn.enabled),
      fn.function_key,
      fn.destination_tab,
      fn.gaql_resource_rule,
      fn.date_grain,
      fn.lookback_days_override ?? cfg.lookbackDays,
      fn.max_rows,
      fn.write_mode,
      fn.gaql_resource_rule.startsWith('N/A') ? 'false' : 'true',
      fn.compatibility_notes,
      fn.status,
      '',
      '',
      '',
    ]);
  }
  return rows;
}

function tabManifestRows(): unknown[][] {
  const header = ['tab_name', 'category', 'description', 'writable_by_script', 'notes'];
  const allTabs = [
    ...SHEET_TABS.core.map(t => [t.tab, 'core', t.description, 'true', '']),
    ...SHEET_TABS.rawData.map(t => [t.tab, 'raw_data', t.description, 'true', '']),
    ...SHEET_TABS.dashboard.map(t => [t.tab, 'dashboard', t.description, 'true', '']),
    ...SHEET_TABS.mapping.map(t => [t.tab, 'mapping', t.description, 'false', 'Manually maintained reference']),
  ];
  return [header, ...allTabs];
}

function fieldManifestRows(): unknown[][] {
  const header = ['job_key', 'field_name', 'data_type', 'gaql_field', 'notes'];
  return [
    header,
    // raw_account_daily
    ['raw_account_daily', 'sync_run_id', 'STRING', 'N/A - internal', 'Auto-generated run identifier'],
    ['raw_account_daily', 'date', 'DATE', 'segments.date', 'YYYY-MM-DD'],
    ['raw_account_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_account_daily', 'account_name', 'STRING', 'customer.descriptive_name', ''],
    ['raw_account_daily', 'currency', 'STRING', 'customer.currency_code', ''],
    ['raw_account_daily', 'timezone', 'STRING', 'customer.time_zone', ''],
    ['raw_account_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_account_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_account_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', 'Divide by 1000000 for actual cost'],
    ['raw_account_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_account_daily', 'conversion_value', 'FLOAT', 'metrics.conversions_value', ''],
    // raw_campaign_daily
    ['raw_campaign_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_campaign_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_campaign_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_campaign_daily', 'campaign_id', 'STRING', 'campaign.id', ''],
    ['raw_campaign_daily', 'campaign_name', 'STRING', 'campaign.name', ''],
    ['raw_campaign_daily', 'campaign_status', 'STRING', 'campaign.status', 'ENABLED | PAUSED | REMOVED'],
    ['raw_campaign_daily', 'advertising_channel_type', 'STRING', 'campaign.advertising_channel_type', ''],
    ['raw_campaign_daily', 'advertising_channel_sub_type', 'STRING', 'campaign.advertising_channel_sub_type', ''],
    ['raw_campaign_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_campaign_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_campaign_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', ''],
    ['raw_campaign_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_campaign_daily', 'conversion_value', 'FLOAT', 'metrics.conversions_value', ''],
    // raw_ad_group_daily
    ['raw_ad_group_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_ad_group_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_ad_group_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_ad_group_daily', 'campaign_id', 'STRING', 'campaign.id', ''],
    ['raw_ad_group_daily', 'campaign_name', 'STRING', 'campaign.name', ''],
    ['raw_ad_group_daily', 'ad_group_id', 'STRING', 'ad_group.id', ''],
    ['raw_ad_group_daily', 'ad_group_name', 'STRING', 'ad_group.name', ''],
    ['raw_ad_group_daily', 'ad_group_status', 'STRING', 'ad_group.status', ''],
    ['raw_ad_group_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_ad_group_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_ad_group_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', ''],
    ['raw_ad_group_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_ad_group_daily', 'conversion_value', 'FLOAT', 'metrics.conversions_value', ''],
    // raw_keyword_daily
    ['raw_keyword_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_keyword_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_keyword_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_keyword_daily', 'campaign_id', 'STRING', 'campaign.id', ''],
    ['raw_keyword_daily', 'campaign_name', 'STRING', 'campaign.name', ''],
    ['raw_keyword_daily', 'ad_group_id', 'STRING', 'ad_group.id', ''],
    ['raw_keyword_daily', 'ad_group_name', 'STRING', 'ad_group.name', ''],
    ['raw_keyword_daily', 'criterion_id', 'STRING', 'ad_group_criterion.criterion_id', ''],
    ['raw_keyword_daily', 'keyword_text', 'STRING', 'ad_group_criterion.keyword.text', ''],
    ['raw_keyword_daily', 'match_type', 'STRING', 'ad_group_criterion.keyword.match_type', 'EXACT | PHRASE | BROAD'],
    ['raw_keyword_daily', 'criterion_status', 'STRING', 'ad_group_criterion.status', ''],
    ['raw_keyword_daily', 'quality_score', 'INTEGER', 'ad_group_criterion.quality_info.quality_score', ''],
    ['raw_keyword_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_keyword_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_keyword_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', ''],
    ['raw_keyword_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_keyword_daily', 'conversion_value', 'FLOAT', 'metrics.conversions_value', ''],
    // raw_search_terms_daily
    ['raw_search_terms_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_search_terms_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_search_terms_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_search_terms_daily', 'campaign_id', 'STRING', 'campaign.id', ''],
    ['raw_search_terms_daily', 'campaign_name', 'STRING', 'campaign.name', ''],
    ['raw_search_terms_daily', 'ad_group_id', 'STRING', 'ad_group.id', ''],
    ['raw_search_terms_daily', 'ad_group_name', 'STRING', 'ad_group.name', ''],
    ['raw_search_terms_daily', 'search_term', 'STRING', 'search_term_view.search_term', ''],
    ['raw_search_terms_daily', 'search_term_status', 'STRING', 'search_term_view.status', 'ADDED | EXCLUDED | NONE'],
    ['raw_search_terms_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_search_terms_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_search_terms_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', ''],
    ['raw_search_terms_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_search_terms_daily', 'conversion_value', 'FLOAT', 'metrics.conversions_value', ''],
    // raw_pmax_asset_group_daily
    ['raw_pmax_asset_group_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_pmax_asset_group_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_pmax_asset_group_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_pmax_asset_group_daily', 'campaign_id', 'STRING', 'campaign.id', ''],
    ['raw_pmax_asset_group_daily', 'campaign_name', 'STRING', 'campaign.name', ''],
    ['raw_pmax_asset_group_daily', 'asset_group_id', 'STRING', 'asset_group.id', ''],
    ['raw_pmax_asset_group_daily', 'asset_group_name', 'STRING', 'asset_group.name', ''],
    ['raw_pmax_asset_group_daily', 'asset_group_status', 'STRING', 'asset_group.status', ''],
    ['raw_pmax_asset_group_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_pmax_asset_group_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_pmax_asset_group_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', ''],
    ['raw_pmax_asset_group_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_pmax_asset_group_daily', 'conversion_value', 'FLOAT', 'metrics.conversions_value', ''],
    // raw_pmax_terms_daily
    ['raw_pmax_terms_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_pmax_terms_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_pmax_terms_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_pmax_terms_daily', 'campaign_id', 'STRING', 'campaign.id', ''],
    ['raw_pmax_terms_daily', 'campaign_name', 'STRING', 'campaign.name', ''],
    ['raw_pmax_terms_daily', 'search_term', 'STRING', 'segments.search_term_match_type', 'PMax term-level from shopping_performance_view'],
    ['raw_pmax_terms_daily', 'category', 'STRING', 'segments.product_category_level1', ''],
    ['raw_pmax_terms_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_pmax_terms_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_pmax_terms_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', ''],
    ['raw_pmax_terms_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_pmax_terms_daily', 'conversion_value', 'FLOAT', 'metrics.conversions_value', ''],
    // raw_geo_daily
    ['raw_geo_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_geo_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_geo_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_geo_daily', 'campaign_id', 'STRING', 'campaign.id', ''],
    ['raw_geo_daily', 'campaign_name', 'STRING', 'campaign.name', ''],
    ['raw_geo_daily', 'geo_target_constant_id', 'STRING', 'geographic_view.country_criterion_id', ''],
    ['raw_geo_daily', 'country_code', 'STRING', 'geographic_view.country_criterion_id', 'Map via geo_target_constant'],
    ['raw_geo_daily', 'region', 'STRING', 'geographic_view.location_type', ''],
    ['raw_geo_daily', 'location_type', 'STRING', 'geographic_view.location_type', 'CITY | COUNTRY | REGION'],
    ['raw_geo_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_geo_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_geo_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', ''],
    ['raw_geo_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_geo_daily', 'conversion_value', 'FLOAT', 'metrics.conversions_value', ''],
    // raw_device_daily
    ['raw_device_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_device_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_device_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_device_daily', 'campaign_id', 'STRING', 'campaign.id', ''],
    ['raw_device_daily', 'campaign_name', 'STRING', 'campaign.name', ''],
    ['raw_device_daily', 'device', 'STRING', 'segments.device', 'MOBILE | DESKTOP | TABLET | CONNECTED_TV'],
    ['raw_device_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_device_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_device_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', ''],
    ['raw_device_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_device_daily', 'conversion_value', 'FLOAT', 'metrics.conversions_value', ''],
    // raw_conversion_action_daily
    ['raw_conversion_action_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_conversion_action_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_conversion_action_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_conversion_action_daily', 'conversion_action_id', 'STRING', 'conversion_action.id', ''],
    ['raw_conversion_action_daily', 'conversion_action_name', 'STRING', 'conversion_action.name', ''],
    ['raw_conversion_action_daily', 'conversion_action_type', 'STRING', 'conversion_action.type', ''],
    ['raw_conversion_action_daily', 'conversion_action_category', 'STRING', 'conversion_action.category', ''],
    ['raw_conversion_action_daily', 'conversion_action_status', 'STRING', 'conversion_action.status', ''],
    ['raw_conversion_action_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_conversion_action_daily', 'conversion_value', 'FLOAT', 'metrics.conversions_value', ''],
    // raw_budget_daily
    ['raw_budget_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_budget_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_budget_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_budget_daily', 'campaign_id', 'STRING', 'campaign.id', ''],
    ['raw_budget_daily', 'campaign_name', 'STRING', 'campaign.name', ''],
    ['raw_budget_daily', 'budget_id', 'STRING', 'campaign_budget.id', ''],
    ['raw_budget_daily', 'budget_name', 'STRING', 'campaign_budget.name', ''],
    ['raw_budget_daily', 'budget_amount_micros', 'INTEGER', 'campaign_budget.amount_micros', ''],
    ['raw_budget_daily', 'budget_delivery_method', 'STRING', 'campaign_budget.delivery_method', 'STANDARD | ACCELERATED'],
    ['raw_budget_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', ''],
    ['raw_budget_daily', 'budget_utilization_pct', 'FLOAT', 'N/A - computed', 'cost_micros / budget_amount_micros * 100'],
    // raw_change_history_daily
    ['raw_change_history_daily', 'sync_run_id', 'STRING', 'N/A - internal', ''],
    ['raw_change_history_daily', 'change_date_time', 'DATETIME', 'change_event.change_date_time', ''],
    ['raw_change_history_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_change_history_daily', 'user_email', 'STRING', 'change_event.user_email', ''],
    ['raw_change_history_daily', 'change_resource_type', 'STRING', 'change_event.change_resource_type', ''],
    ['raw_change_history_daily', 'change_resource_name', 'STRING', 'change_event.change_resource_name', ''],
    ['raw_change_history_daily', 'client_type', 'STRING', 'change_event.client_type', ''],
    ['raw_change_history_daily', 'changed_fields', 'STRING', 'change_event.changed_fields', ''],
    ['raw_change_history_daily', 'old_resource', 'STRING', 'change_event.old_resource', 'JSON snapshot'],
    ['raw_change_history_daily', 'new_resource', 'STRING', 'change_event.new_resource', 'JSON snapshot'],
  ];
}

function gaqlCompatibilityRows(): unknown[][] {
  return [
    ['job_key', 'safe_from_resource', 'allowed_segments', 'forbidden_segments', 'known_error_to_avoid', 'safe_metric_fields', 'notes'],
    ['raw_account_daily', 'customer', 'segments.date, segments.device', '', '', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value', 'Customer resource is safe for account-level metrics'],
    ['raw_campaign_daily', 'campaign', 'segments.date, segments.device, segments.ad_network_type', '', '', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value', 'Safe to select campaign.* fields from campaign resource'],
    ['raw_ad_group_daily', 'ad_group', 'segments.date, segments.device', '', '', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value', 'Select from ad_group resource. Avoid mixing with campaign_search_term_view'],
    ['raw_keyword_daily', 'ad_group_criterion', 'segments.date', '', 'Do not use campaign_search_term_view.status — unrecognized field', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions', 'Filter WHERE ad_group_criterion.type = KEYWORD'],
    ['raw_search_terms_daily', 'search_term_view', 'segments.date', 'campaign_search_term_view.status', 'FORBIDDEN: campaign_search_term_view.status is unrecognized. Use search_term_view.status', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions', 'Use search_term_view only — do not mix with campaign_search_term_view'],
    ['raw_pmax_asset_group_daily', 'asset_group', 'segments.date', 'segments.asset_interaction_target.asset', 'FORBIDDEN: segments.asset_interaction_target.asset from asset_group is incompatible segment', 'metrics.impressions, metrics.clicks, metrics.cost_micros', 'Do NOT select asset_interaction_target.asset from asset_group'],
    ['raw_pmax_terms_daily', 'shopping_performance_view', 'segments.date, segments.product_category_level1', '', '', 'metrics.impressions, metrics.clicks, metrics.cost_micros', 'Use shopping_performance_view for PMax term-level data'],
    ['raw_geo_daily', 'geographic_view', 'geographic_view.location_type', 'segments.geo_target_country', 'FORBIDDEN: segments.geo_target_country is incompatible with geographic_view', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions', 'Do NOT select geo_target_country segment from geographic_view'],
    ['raw_device_daily', 'campaign', 'segments.device, segments.date', '', '', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions', 'Segment by segments.device from campaign resource'],
    ['raw_conversion_action_daily', 'conversion_action', 'segments.conversion_action, segments.date', '', '', 'metrics.conversions, metrics.conversions_value', 'Select from conversion_action resource with segments.conversion_action'],
    ['raw_budget_daily', 'campaign_budget', 'segments.date', '', '', 'metrics.cost_micros', 'Select from campaign_budget resource'],
    ['raw_change_history_daily', 'change_event', 'segments.date', 'campaign.*', 'FORBIDDEN: Do not select campaign.* fields from change_event resource', 'N/A', 'Only change_event native fields allowed. No campaign.* fields.'],
  ];
}

function qaChecklistRows(): unknown[][] {
  return [
    ['check_item', 'status', 'notes'],
    ['Sheet is isolated per account — not shared', 'PENDING', ''],
    ['customer_id is correct', 'PENDING', ''],
    ['timezone is correct', 'PENDING', ''],
    ['currency is correct', 'PENDING', ''],
    ['environment is set correctly (not accidentally production)', 'PENDING', ''],
    ['_settings_exporter populated', 'PENDING', ''],
    ['_settings_bridge BRIDGE_TOKEN_PLACEHOLDER replaced with real token', 'PENDING', ''],
    ['_export_jobs enabled/disabled correctly', 'PENDING', ''],
    ['Google Ads Script SHEET_URL points to this specific Sheet', 'PENDING', ''],
    ['Script authorized under correct Google Ads account', 'PENDING', ''],
    ['Test run completed — _script_health shows no errors', 'PENDING', ''],
    ['No real secrets hardcoded in script', 'PENDING', ''],
    ['PMax exports disabled if account has no PMax campaigns', 'PENDING', ''],
    ['max_rows configured appropriately for account scale', 'PENDING', ''],
    ['owner_email is correct and has Sheet access', 'PENDING', ''],
    ['Bridge endpoint URL replaced if bridge enabled', 'PENDING', ''],
  ];
}

function scriptHealthRows(): unknown[][] {
  return [
    ['sync_run_id', 'run_at', 'status', 'script_version', 'duration_ms', 'rows_written', 'errors_count', 'environment', 'notes'],
    ['(auto-populated by script)', '', '', '', '', '', '', '', ''],
  ];
}

function syncRunsRows(): unknown[][] {
  return [
    ['sync_run_id', 'started_at', 'completed_at', 'status', 'jobs_run', 'total_rows', 'error_count', 'triggered_by'],
    ['(auto-populated by script)', '', '', '', '', '', '', ''],
  ];
}

function errorLogRows(): unknown[][] {
  return [
    ['sync_run_id', 'occurred_at', 'severity', 'job_key', 'error_code', 'error_message', 'stack_trace'],
    ['(auto-populated by script)', '', '', '', '', '', ''],
  ];
}

const RAW_HEADERS: Record<string, string[]> = {
  raw_account_daily: [
    'sync_run_id', 'date', 'customer_id', 'account_name', 'currency', 'timezone',
    'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value',
  ],
  raw_campaign_daily: [
    'sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name', 'campaign_status',
    'advertising_channel_type', 'advertising_channel_sub_type',
    'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value',
  ],
  raw_ad_group_daily: [
    'sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name',
    'ad_group_id', 'ad_group_name', 'ad_group_status',
    'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value',
  ],
  raw_keyword_daily: [
    'sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name',
    'ad_group_id', 'ad_group_name', 'criterion_id', 'keyword_text', 'match_type', 'criterion_status', 'quality_score',
    'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value',
  ],
  raw_search_terms_daily: [
    'sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name',
    'ad_group_id', 'ad_group_name', 'search_term', 'search_term_status',
    'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value',
  ],
  raw_pmax_asset_group_daily: [
    'sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name',
    'asset_group_id', 'asset_group_name', 'asset_group_status',
    'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value',
  ],
  raw_pmax_terms_daily: [
    'sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name',
    'search_term', 'category',
    'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value',
  ],
  raw_geo_daily: [
    'sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name',
    'geo_target_constant_id', 'country_code', 'region', 'location_type',
    'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value',
  ],
  raw_device_daily: [
    'sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name',
    'device',
    'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value',
  ],
  raw_conversion_action_daily: [
    'sync_run_id', 'date', 'customer_id',
    'conversion_action_id', 'conversion_action_name', 'conversion_action_type',
    'conversion_action_category', 'conversion_action_status',
    'conversions', 'conversion_value',
  ],
  raw_budget_daily: [
    'sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name',
    'budget_id', 'budget_name', 'budget_amount_micros', 'budget_delivery_method',
    'cost_micros', 'budget_utilization_pct',
  ],
  raw_change_history_daily: [
    'sync_run_id', 'change_date_time', 'customer_id', 'user_email',
    'change_resource_type', 'change_resource_name', 'client_type',
    'changed_fields', 'old_resource', 'new_resource',
  ],
};

function rawDataHeaders(tabName: string): unknown[][] {
  const header = RAW_HEADERS[tabName] ?? ['sync_run_id', 'date', 'customer_id'];
  return [header, ['(auto-populated by script)', ...Array(header.length - 1).fill('')]];
}

function dashboardTabRows(tabName: string): unknown[][] {
  const headers: Record<string, string[]> = {
    dashboard_summary_daily: ['date', 'account_name', 'impressions', 'clicks', 'ctr', 'avg_cpc', 'cost', 'conversions', 'conv_rate', 'cost_per_conv', 'conv_value', 'roas'],
    dashboard_campaign_daily: ['date', 'campaign_name', 'campaign_type', 'status', 'impressions', 'clicks', 'cost', 'conversions', 'roas'],
    dashboard_pmax_daily: ['date', 'campaign_name', 'asset_group_name', 'impressions', 'clicks', 'cost', 'conversions'],
    dashboard_geo_daily: ['date', 'country_code', 'region', 'impressions', 'clicks', 'cost', 'conversions'],
    dashboard_terms_daily: ['date', 'search_term', 'campaign_name', 'impressions', 'clicks', 'cost', 'conversions'],
    dashboard_conversion_daily: ['date', 'conversion_action_name', 'conversion_type', 'conversions', 'conversion_value'],
  };
  const header = headers[tabName] ?? ['date', 'value'];
  return [header, ['(auto-populated by script)', ...Array(header.length - 1).fill('')]];
}

function mapTabRows(tabName: string): unknown[][] {
  const headers: Record<string, string[]> = {
    map_accounts: ['customer_id', 'account_name', 'timezone', 'currency', 'status', 'notes'],
    map_campaigns: ['campaign_id', 'campaign_name', 'campaign_type', 'status', 'budget_id', 'notes'],
    map_ad_groups: ['ad_group_id', 'ad_group_name', 'campaign_id', 'status', 'notes'],
    map_conversion_actions: ['conversion_action_id', 'name', 'type', 'category', 'status', 'notes'],
    map_geo_targets: ['geo_target_constant_id', 'name', 'country_code', 'type', 'notes'],
    map_channels: ['channel_type', 'channel_subtype', 'description', 'notes'],
  };
  const header = headers[tabName] ?? ['id', 'name', 'notes'];
  return [header];
}

export function generateWorkbook(cfg: DraftConfig): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const add = (name: string, rows: unknown[][]) => {
    XLSX.utils.book_append_sheet(wb, makeSheet(rows), name);
  };

  add('README', readmeRows(cfg));
  add('_settings_global', settingsGlobalRows(cfg));
  add('_settings_account', settingsAccountRows(cfg));
  add('_settings_exporter', settingsExporterRows(cfg));
  add('_settings_bridge', settingsBridgeRows(cfg));
  add('_settings_dashboard', settingsDashboardRows(cfg));
  add('_export_jobs', exportJobsRows(cfg));
  add('_tab_manifest', tabManifestRows());
  add('_field_manifest', fieldManifestRows());
  add('_gaql_compatibility_matrix', gaqlCompatibilityRows());
  add('_qa_checklist', qaChecklistRows());
  add('_script_health', scriptHealthRows());
  add('_sync_runs', syncRunsRows());
  add('_error_log', errorLogRows());

  for (const t of SHEET_TABS.rawData) {
    add(t.tab, rawDataHeaders(t.tab));
  }

  for (const t of SHEET_TABS.dashboard) {
    add(t.tab, dashboardTabRows(t.tab));
  }

  for (const t of SHEET_TABS.mapping) {
    add(t.tab, mapTabRows(t.tab));
  }

  return wb;
}

export function getFilenameBase(cfg: DraftConfig): string {
  const dt = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const nick = (cfg.accountNickname || 'account').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const cid = (cfg.customerId || 'nocid').replace(/[^0-9]/g, '');
  return `bitmonitor-sheet-${nick}-${cid}-${dt}`;
}

export function downloadXlsx(cfg: DraftConfig) {
  const wb = generateWorkbook(cfg);
  const filename = `${getFilenameBase(cfg)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export async function downloadCsvZip(cfg: DraftConfig) {
  const wb = generateWorkbook(cfg);
  const zip = new JSZip();
  const folder = zip.folder(getFilenameBase(cfg))!;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws);
    folder.file(`${sheetName}.csv`, csv);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${getFilenameBase(cfg)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export { RAW_HEADERS };
