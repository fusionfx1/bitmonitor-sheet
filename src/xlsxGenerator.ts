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
    ['Generated At', now],
    ['Sheet Version', cfg.sheetVersion],
    ['Script Version', cfg.scriptVersion],
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
  return [
    ['key', 'value', 'type', 'required', 'description'],
    ['account_nickname', cfg.accountNickname, 'string', 'true', 'Short nickname for this account'],
    ['customer_id', cfg.customerId, 'string', 'true', 'Google Ads Customer ID (no dashes)'],
    ['timezone', cfg.timezone, 'string', 'true', 'Account timezone string'],
    ['currency', cfg.currency, 'string', 'true', 'ISO currency code'],
    ['environment', cfg.environment, 'string', 'true', 'test | staging | production'],
    ['owner_email', cfg.ownerEmail, 'string', 'true', 'Owner email for access tracking'],
    ['export_schedule_note', cfg.exportScheduleNote, 'string', 'false', 'Human note about export schedule'],
    ['template_type', cfg.templateType, 'string', 'true', 'Sheet template type used'],
  ];
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
  return [
    ['job_key', 'field_name', 'data_type', 'gaql_field', 'notes'],
    ['raw_account_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_account_daily', 'customer_id', 'STRING', 'customer.id', ''],
    ['raw_account_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_account_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_account_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', 'Divide by 1000000 for actual cost'],
    ['raw_account_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_campaign_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_campaign_daily', 'campaign_id', 'STRING', 'campaign.id', ''],
    ['raw_campaign_daily', 'campaign_name', 'STRING', 'campaign.name', ''],
    ['raw_campaign_daily', 'campaign_status', 'STRING', 'campaign.status', ''],
    ['raw_campaign_daily', 'impressions', 'INTEGER', 'metrics.impressions', ''],
    ['raw_campaign_daily', 'clicks', 'INTEGER', 'metrics.clicks', ''],
    ['raw_campaign_daily', 'cost_micros', 'INTEGER', 'metrics.cost_micros', ''],
    ['raw_campaign_daily', 'conversions', 'FLOAT', 'metrics.conversions', ''],
    ['raw_keyword_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_keyword_daily', 'keyword_text', 'STRING', 'ad_group_criterion.keyword.text', ''],
    ['raw_keyword_daily', 'match_type', 'STRING', 'ad_group_criterion.keyword.match_type', ''],
    ['raw_search_terms_daily', 'date', 'DATE', 'segments.date', ''],
    ['raw_search_terms_daily', 'search_term', 'STRING', 'search_term_view.search_term', ''],
    ['raw_search_terms_daily', 'status', 'STRING', 'search_term_view.status', 'ADDED | EXCLUDED | NONE'],
  ];
}

function gaqlCompatibilityRows(): unknown[][] {
  return [
    ['job_key', 'safe_from_resource', 'allowed_segments', 'forbidden_segments', 'known_error_to_avoid', 'notes'],
    ['raw_account_daily', 'customer', 'segments.date, segments.device', '', '', 'Customer resource is safe for account-level metrics'],
    ['raw_campaign_daily', 'campaign', 'segments.date, segments.device, segments.ad_network_type', '', '', ''],
    ['raw_ad_group_daily', 'ad_group', 'segments.date, segments.device', '', '', ''],
    ['raw_keyword_daily', 'ad_group_criterion', 'segments.date', '', 'Do not use campaign_search_term_view.status', 'Filter by type = KEYWORD'],
    ['raw_search_terms_daily', 'search_term_view', 'segments.date', 'campaign_search_term_view.status', 'Unrecognized field campaign_search_term_view.status', 'Use search_term_view only'],
    ['raw_pmax_asset_group_daily', 'asset_group', 'segments.date', 'segments.asset_interaction_target.asset', 'Incompatible segment asset_interaction_target.asset from asset_group', 'Do NOT select that segment'],
    ['raw_pmax_terms_daily', 'shopping_performance_view', 'segments.date', '', '', 'Use shopping_performance_view for PMax term-level data'],
    ['raw_geo_daily', 'geographic_view', 'geographic_view.location_type', 'segments.geo_target_country', 'Incompatible: segments.geo_target_country from geographic_view', 'Do NOT select geo_target_country segment'],
    ['raw_device_daily', 'campaign', 'segments.device, segments.date', '', '', 'Segment by device from campaign resource'],
    ['raw_conversion_action_daily', 'conversion_action', 'segments.conversion_action', '', '', ''],
    ['raw_budget_daily', 'campaign_budget', 'segments.date', '', '', ''],
    ['raw_change_history_daily', 'change_event', 'segments.date', 'campaign.*', 'Do not select campaign.* from change_event resource', 'Only change_event native fields'],
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

function rawDataHeaders(tabName: string): unknown[][] {
  const commonCols = ['sync_run_id', 'date', 'customer_id', 'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value'];
  const extraCols: Record<string, string[]> = {
    raw_campaign_daily: ['campaign_id', 'campaign_name', 'campaign_status', 'campaign_type'],
    raw_ad_group_daily: ['campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'ad_group_status'],
    raw_keyword_daily: ['campaign_id', 'ad_group_id', 'keyword_text', 'match_type', 'quality_score'],
    raw_search_terms_daily: ['campaign_id', 'ad_group_id', 'search_term', 'search_term_status'],
    raw_pmax_asset_group_daily: ['campaign_id', 'asset_group_id', 'asset_group_name', 'asset_group_status'],
    raw_pmax_terms_daily: ['campaign_id', 'search_term', 'segment_type'],
    raw_geo_daily: ['campaign_id', 'country_code', 'region', 'location_type'],
    raw_device_daily: ['campaign_id', 'device_type'],
    raw_conversion_action_daily: ['conversion_action_id', 'conversion_action_name', 'conversion_action_type'],
    raw_budget_daily: ['campaign_id', 'campaign_name', 'budget_amount_micros', 'budget_utilization_pct'],
    raw_change_history_daily: ['change_resource_type', 'change_resource_name', 'changed_fields', 'old_resource', 'new_resource', 'changed_by'],
  };
  const extra = extraCols[tabName] ?? [];
  const header = [...commonCols.slice(0, 2), ...extra, ...commonCols.slice(2)];
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
