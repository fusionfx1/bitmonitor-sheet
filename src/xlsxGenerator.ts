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
  const maxCols = Math.max(...rows.map(r => r.length));
  ws['!cols'] = Array.from({ length: maxCols }, (_, i) => {
    const maxLen = Math.max(...rows.map(r => String(r[i] ?? '').length), 8);
    return { wch: Math.min(maxLen + 2, 70) };
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
    ['--- REQUIRED FLOW ---'],
    ['1. Create/import this workbook into one Google Sheet.'],
    ['2. Paste the full Google Ads Script Exporter into Google Ads Scripts.'],
    ['3. Run manually once and verify _script_health, _sync_runs, and _error_log.'],
    ['4. Set hourly schedule only after the manual run passes.'],
    ['5. Optional: deploy Apps Script Bridge only when dashboard access is needed.'],
    [],
    ['--- BUDGET ACTION SAFETY ---'],
    ['Budget action tabs are request/approval workflow only.'],
    ['The generated Google Ads Script Exporter is read-only and does not mutate budgets.'],
    ['Staff may request budget changes in _budget_action_requests. Owner approval is required before execution.'],
    [],
    ['--- SCRIPT SETUP CHECKLIST ---'],
    ['[ ] Sheet created in correct account Drive'],
    ['[ ] SHEET_URL set in Google Ads Script'],
    ['[ ] _settings_exporter populated correctly'],
    ['[ ] _export_jobs enabled/disabled as needed'],
    ['[ ] Test run completed with no errors'],
    ['[ ] _script_health tab shows green status'],
    ['[ ] Budget action owner approval policy reviewed'],
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
    ['budget_actions_enabled', fmt(cfg.budgetActionsEnabled), 'boolean', 'false', 'Enable request-only budget action workflow'],
    ['google_ads_exporter_enabled', 'true', 'boolean', 'true', 'Enable Google Ads data exporter'],
  ];
}

function settingsAccountRows(cfg: DraftConfig): unknown[][] {
  return [
    ['key', 'value', 'type', 'required', 'description'],
    ['account_nickname', cfg.accountNickname, 'string', 'true', 'Short nickname for this account'],
    ['customer_id', cfg.customerId, 'string', 'true', 'Google Ads Customer ID'],
    ['timezone', cfg.timezone, 'string', 'true', 'Account timezone string'],
    ['currency', cfg.currency, 'string', 'true', 'ISO currency code'],
    ['environment', cfg.environment, 'string', 'true', 'test | staging | production'],
    ['owner_email', cfg.ownerEmail, 'string', 'true', 'Owner email for access tracking'],
    ['export_schedule_note', cfg.exportScheduleNote, 'string', 'false', 'Human note about export schedule'],
    ['template_type', cfg.templateType, 'string', 'true', 'Sheet template type used'],
    ['is_mcc_child_account', fmt(cfg.isMccChildAccount ?? false), 'boolean', 'false', 'True if this is a child account under an MCC'],
    ['mcc_parent_customer_id', cfg.mccParentCustomerId ?? '', 'string', 'false', 'MCC Manager account Customer ID if applicable'],
  ];
}

function settingsExporterRows(cfg: DraftConfig): unknown[][] {
  return [
    ['key', 'value', 'type', 'required', 'description'],
    ['GOOGLE_ADS_CUSTOMER_ID', cfg.customerId, 'string', 'true', 'Google Ads Customer ID for this account'],
    ['ADS_API_VERSION', cfg.adsApiVersion, 'string', 'true', 'Google Ads API version for AdsApp.report'],
    ['DATE_RANGE_MODE', cfg.dateRangeMode, 'string', 'true', 'TODAY | YESTERDAY | LAST_7_DAYS | LAST_14_DAYS | LAST_30_DAYS | CUSTOM'],
    ['LOOKBACK_DAYS', fmt(cfg.lookbackDays), 'number', 'true', 'Days to look back for data when DATE_RANGE_MODE=CUSTOM'],
    ['MAX_ROWS', fmt(cfg.maxRowsDefault), 'number', 'true', 'Default maximum rows per export'],
    ['MAX_ROWS_PMAX', fmt(cfg.maxRowsPmax), 'number', 'true', 'Max rows for PMax exports'],
    ['MAX_ROWS_TERMS', fmt(cfg.maxRowsTerms), 'number', 'true', 'Max rows for search terms exports'],
    ['WRITE_MODE', cfg.writeMode, 'string', 'true', 'append | overwrite | upsert'],
    ['CLEAR_BEFORE_WRITE', fmt(cfg.writeMode === 'overwrite'), 'boolean', 'false', 'Clear destination tab before writing'],
    ['APPEND_SYNC_RUN_ID', 'true', 'boolean', 'false', 'Append sync_run_id column to each row'],
    ['INCLUDE_ZERO_IMPRESSIONS', fmt(cfg.includeZeroImpressions), 'boolean', 'false', 'Include rows with zero impressions'],
    ['INCLUDE_REMOVED_ENTITIES', fmt(cfg.includeRemovedEntities), 'boolean', 'false', 'Include removed campaigns/ad groups/keywords'],
    ['ENABLE_PMAX_EXPORTS', fmt(cfg.exportFunctions.find(f => f.function_key === 'raw_pmax_asset_group_daily')?.enabled ?? true), 'boolean', 'false', 'Enable Performance Max exports'],
    ['ENABLE_SEARCH_TERMS', fmt(cfg.exportFunctions.find(f => f.function_key === 'raw_search_terms_daily')?.enabled ?? true), 'boolean', 'false', 'Enable search terms export'],
    ['ENABLE_GEO_EXPORT', fmt(cfg.exportFunctions.find(f => f.function_key === 'raw_geo_daily')?.enabled ?? true), 'boolean', 'false', 'Enable geographic view export'],
    ['ENABLE_CONVERSION_ACTION_EXPORT', fmt(cfg.exportFunctions.find(f => f.function_key === 'raw_conversion_action_daily')?.enabled ?? true), 'boolean', 'false', 'Enable conversion action export'],
    ['ENABLE_CHANGE_HISTORY_EXPORT', fmt(cfg.exportFunctions.find(f => f.function_key === 'raw_change_history_daily')?.enabled ?? true), 'boolean', 'false', 'Enable change history export'],
    ['CAMPAIGN_NAME_FILTER', '', 'string', 'false', 'Optional campaign name substring filter'],
    ['LOG_LEVEL', cfg.enableDebugLogs ? 'DEBUG' : 'INFO', 'string', 'false', 'DEBUG | INFO | WARN | ERROR'],
  ];
}

function settingsBridgeRows(cfg: DraftConfig): unknown[][] {
  return [
    ['key', 'value', 'type', 'required', 'description'],
    ['BRIDGE_ENABLED', fmt(cfg.bridgeEnabled), 'boolean', 'true', 'Enable the Apps Script bridge'],
    ['BRIDGE_TOKEN_PLACEHOLDER', cfg.bridgeTokenPlaceholder, 'string', 'true', 'Placeholder token; replace with your own secure token'],
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
    ['ALERT_IF_COST_SPIKE_PERCENT_GT', fmt(cfg.alertIfCostSpikePercentGt), 'number', 'false', 'Alert if cost spikes by this percent vs prior period'],
    ['ALERT_IF_CONVERSION_DROP_PERCENT_GT', fmt(cfg.alertIfConversionDropPercentGt), 'number', 'false', 'Alert if conversions drop by this percent vs prior period'],
  ];
}

function settingsBudgetActionsRows(cfg: DraftConfig): unknown[][] {
  return [
    ['key', 'value', 'type', 'required', 'description'],
    ['BUDGET_ACTIONS_ENABLED', fmt(cfg.budgetActionsEnabled), 'boolean', 'true', 'Enable request-only budget action workflow'],
    ['REQUIRE_OWNER_APPROVAL', fmt(cfg.budgetRequireOwnerApproval), 'boolean', 'true', 'Owner approval is required before any execution'],
    ['MAX_INCREASE_PCT', fmt(cfg.budgetMaxIncreasePct), 'number', 'true', 'Maximum increase percentage staff may request'],
    ['MAX_DECREASE_PCT', fmt(cfg.budgetMaxDecreasePct), 'number', 'true', 'Maximum decrease percentage staff may request'],
    ['EXECUTION_MODE', cfg.budgetExecutionMode, 'string', 'true', 'request_only | external_owner_tool'],
    ['OWNER_APPROVAL_CONTACT', cfg.budgetOwnerApprovalContact, 'string', 'false', 'Owner approval contact channel'],
    ['APPROVED_EXECUTION_TOOL', cfg.budgetApprovedExecutionTool, 'string', 'false', 'External owner-approved tool used for execution'],
    ['GOOGLE_ADS_EXPORTER_CAN_MUTATE', 'false', 'boolean', 'true', 'Hard safety rule: exporter must remain read-only'],
  ];
}

function budgetPolicyRows(cfg: DraftConfig): unknown[][] {
  return [
    ['policy_key', 'value', 'severity', 'description'],
    ['owner_approval_required', fmt(cfg.budgetRequireOwnerApproval), 'BLOCKER', 'All budget actions require owner approval before execution'],
    ['max_increase_pct', fmt(cfg.budgetMaxIncreasePct), 'BLOCKER', 'Maximum staff-requested increase percentage'],
    ['max_decrease_pct', fmt(cfg.budgetMaxDecreasePct), 'BLOCKER', 'Maximum staff-requested decrease percentage'],
    ['execution_mode', cfg.budgetExecutionMode, 'INFO', 'This workbook queues requests only; execution is external'],
    ['exporter_read_only', 'true', 'BLOCKER', 'Generated Google Ads Script must not mutate budgets or campaigns'],
  ];
}

function budgetActionRequestsRows(): unknown[][] {
  return [
    [
      'request_id', 'created_at', 'requested_by', 'customer_id', 'campaign_id', 'campaign_name',
      'action_type', 'current_budget', 'requested_budget', 'requested_change_pct', 'currency',
      'reason', 'evidence_tab', 'evidence_range_or_url', 'status', 'owner_decision_id', 'notes',
    ],
    [
      'REQ-EXAMPLE', '', '', '', '', '', 'INCREASE_BUDGET', '', '', '10', '',
      'Example only. Replace or delete this row before use.', 'raw_campaign_daily', '', 'DRAFT', '', '',
    ],
  ];
}

function ownerApprovalLogRows(): unknown[][] {
  return [
    [
      'decision_id', 'request_id', 'decision_at', 'owner', 'decision', 'approved_change_pct',
      'approved_budget', 'execution_tool', 'executed_at', 'execution_status', 'notes',
    ],
    ['DEC-EXAMPLE', 'REQ-EXAMPLE', '', '', 'PENDING', '', '', '', '', 'NOT_EXECUTED', 'Example only.'],
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
      fmt(fn.enabled), fn.function_key, fn.destination_tab, fn.gaql_resource_rule,
      fn.date_grain, fn.lookback_days_override ?? cfg.lookbackDays, fn.max_rows,
      fn.write_mode, fn.gaql_resource_rule.startsWith('N/A') ? 'false' : 'true',
      fn.compatibility_notes, fn.status, '', '', '',
    ]);
  }
  return rows;
}

function tabManifestRows(): unknown[][] {
  const header = ['tab_name', 'category', 'description', 'writable_by_script', 'notes'];
  const allTabs = [
    ...SHEET_TABS.core.map(t => [t.tab, 'core', t.description, String(!t.tab.includes('budget_action') && t.tab !== '_owner_approval_log'), t.tab.includes('budget_action') || t.tab === '_owner_approval_log' ? 'Manual request/approval workflow' : '']),
    ...SHEET_TABS.rawData.map(t => [t.tab, 'raw_data', t.description, 'true', '']),
    ...SHEET_TABS.dashboard.map(t => [t.tab, 'dashboard', t.description, 'true', '']),
    ...SHEET_TABS.mapping.map(t => [t.tab, 'mapping', t.description, 'false', 'Manually maintained reference']),
  ];
  return [header, ...allTabs];
}

function fieldManifestRows(): unknown[][] {
  const rows: unknown[][] = [['job_key', 'field_name', 'data_type', 'gaql_field', 'notes']];
  for (const [jobKey, headers] of Object.entries(RAW_HEADERS)) {
    for (const field of headers) {
      rows.push([jobKey, field, field.includes('cost') || field.includes('budget') ? 'NUMBER' : 'STRING', field === 'sync_run_id' ? 'N/A - internal' : '', '']);
    }
  }
  return rows;
}

function gaqlCompatibilityRows(): unknown[][] {
  return [
    ['job_key', 'safe_from_resource', 'allowed_segments', 'forbidden_segments', 'known_error_to_avoid', 'safe_metric_fields', 'notes'],
    ['raw_account_daily', 'customer', 'segments.date', '', '', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value', 'Customer resource is safe for account-level metrics'],
    ['raw_campaign_daily', 'campaign', 'segments.date', '', '', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value', 'Safe to select campaign.* fields from campaign resource'],
    ['raw_ad_group_daily', 'ad_group', 'segments.date', '', '', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value', 'Select from ad_group resource'],
    ['raw_keyword_daily', 'ad_group_criterion', 'segments.date', '', 'Do not use campaign_search_term_view.status', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions', 'Filter WHERE ad_group_criterion.type = KEYWORD'],
    ['raw_search_terms_daily', 'search_term_view', 'segments.date', 'campaign_search_term_view.status', 'Use search_term_view.status only', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions', 'Use search_term_view only'],
    ['raw_pmax_asset_group_daily', 'asset_group', 'segments.date', 'segments.asset_interaction_target.asset', 'asset_interaction_target.asset is incompatible', 'metrics.impressions, metrics.clicks, metrics.cost_micros', 'Do not select asset_interaction_target.asset'],
    ['raw_pmax_terms_daily', 'shopping_performance_view', 'segments.date, segments.product_category_level1', '', '', 'metrics.impressions, metrics.clicks, metrics.cost_micros', 'Category/match-type data, not literal PMax search term text'],
    ['raw_geo_daily', 'geographic_view', 'geographic_view.location_type', 'segments.geo_target_country', 'geo_target_country is incompatible', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions', 'country_code field needs mapping from criterion ID'],
    ['raw_device_daily', 'campaign', 'segments.device, segments.date', '', '', 'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions', 'Segment by device'],
    ['raw_conversion_action_daily', 'conversion_action', 'segments.date', '', '', 'metrics.conversions, metrics.conversions_value', 'Conversion reporting only'],
    ['raw_budget_daily', 'campaign', 'segments.date', '', '', 'metrics.cost_micros', 'Read-only budget reporting only; no mutate'],
    ['raw_change_history_daily', 'change_event', 'change_event.change_date_time', 'campaign.*', 'Do not select campaign.* fields from change_event', 'N/A', 'Only change_event native fields allowed'],
  ];
}

function qaChecklistRows(): unknown[][] {
  return [
    ['check_item', 'status', 'notes'],
    ['Sheet is isolated per account and not shared across accounts', 'PENDING', ''],
    ['customer_id is correct', 'PENDING', ''],
    ['timezone is correct', 'PENDING', ''],
    ['currency is correct', 'PENDING', ''],
    ['environment is set correctly', 'PENDING', ''],
    ['_settings_exporter populated', 'PENDING', ''],
    ['_export_jobs enabled/disabled correctly', 'PENDING', ''],
    ['Google Ads Script SHEET_URL points to this specific Sheet', 'PENDING', ''],
    ['Script authorized under correct Google Ads account', 'PENDING', ''],
    ['Test run completed and _script_health shows no errors', 'PENDING', ''],
    ['No real secrets hardcoded in script', 'PENDING', ''],
    ['Budget action policy reviewed by owner', 'PENDING', ''],
    ['Budget action requests require owner approval', 'PENDING', ''],
    ['Exporter remains read-only with no mutate code', 'PENDING', ''],
  ];
}

function scriptHealthRows(): unknown[][] {
  return [['sync_run_id', 'run_at', 'status', 'script_version', 'duration_ms', 'rows_written', 'errors_count', 'environment', 'notes'], ['(auto-populated by script)', '', '', '', '', '', '', '', '']];
}

function syncRunsRows(): unknown[][] {
  return [['sync_run_id', 'started_at', 'completed_at', 'status', 'jobs_run', 'total_rows', 'error_count', 'triggered_by'], ['(auto-populated by script)', '', '', '', '', '', '', '']];
}

function errorLogRows(): unknown[][] {
  return [['sync_run_id', 'occurred_at', 'severity', 'job_key', 'error_code', 'error_message', 'stack_trace'], ['(auto-populated by script)', '', '', '', '', '', '']];
}

export const RAW_HEADERS: Record<string, string[]> = {
  raw_account_daily: ['sync_run_id', 'date', 'customer_id', 'account_name', 'currency', 'timezone', 'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value'],
  raw_campaign_daily: ['sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name', 'campaign_status', 'advertising_channel_type', 'advertising_channel_sub_type', 'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value'],
  raw_ad_group_daily: ['sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'ad_group_status', 'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value'],
  raw_keyword_daily: ['sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'criterion_id', 'keyword_text', 'match_type', 'criterion_status', 'quality_score', 'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value'],
  raw_search_terms_daily: ['sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name', 'ad_group_id', 'ad_group_name', 'search_term', 'search_term_status', 'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value'],
  raw_pmax_asset_group_daily: ['sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name', 'asset_group_id', 'asset_group_name', 'asset_group_status', 'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value'],
  raw_pmax_terms_daily: ['sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name', 'search_term_match_type', 'product_category_level1', 'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value'],
  raw_geo_daily: ['sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name', 'geo_target_constant_id', 'country_criterion_id', 'location_type', 'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value'],
  raw_device_daily: ['sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name', 'device', 'impressions', 'clicks', 'cost_micros', 'conversions', 'conversion_value'],
  raw_conversion_action_daily: ['sync_run_id', 'date', 'customer_id', 'conversion_action_id', 'conversion_action_name', 'conversion_action_type', 'conversion_action_category', 'conversion_action_status', 'conversions', 'conversion_value'],
  raw_budget_daily: ['sync_run_id', 'date', 'customer_id', 'campaign_id', 'campaign_name', 'budget_id', 'budget_name', 'budget_amount_micros', 'budget_delivery_method', 'cost_micros', 'budget_utilization_pct'],
  raw_change_history_daily: ['sync_run_id', 'change_date_time', 'customer_id', 'user_email', 'change_resource_type', 'change_resource_name', 'client_type', 'changed_fields', 'old_resource', 'new_resource'],
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
    dashboard_geo_daily: ['date', 'country_criterion_id', 'location_type', 'impressions', 'clicks', 'cost', 'conversions'],
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
  return [headers[tabName] ?? ['id', 'name', 'notes']];
}

export function generateWorkbook(cfg: DraftConfig): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: unknown[][]) => XLSX.utils.book_append_sheet(wb, makeSheet(rows), name);

  add('README', readmeRows(cfg));
  add('_settings_global', settingsGlobalRows(cfg));
  add('_settings_account', settingsAccountRows(cfg));
  add('_settings_exporter', settingsExporterRows(cfg));
  add('_settings_bridge', settingsBridgeRows(cfg));
  add('_settings_dashboard', settingsDashboardRows(cfg));
  add('_settings_budget_actions', settingsBudgetActionsRows(cfg));
  add('_budget_action_policy', budgetPolicyRows(cfg));
  add('_budget_action_requests', budgetActionRequestsRows());
  add('_owner_approval_log', ownerApprovalLogRows());
  add('_export_jobs', exportJobsRows(cfg));
  add('_tab_manifest', tabManifestRows());
  add('_field_manifest', fieldManifestRows());
  add('_gaql_compatibility_matrix', gaqlCompatibilityRows());
  add('_qa_checklist', qaChecklistRows());
  add('_script_health', scriptHealthRows());
  add('_sync_runs', syncRunsRows());
  add('_error_log', errorLogRows());

  for (const t of SHEET_TABS.rawData) add(t.tab, rawDataHeaders(t.tab));
  for (const t of SHEET_TABS.dashboard) add(t.tab, dashboardTabRows(t.tab));
  for (const t of SHEET_TABS.mapping) add(t.tab, mapTabRows(t.tab));

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
  XLSX.writeFile(wb, `${getFilenameBase(cfg)}.xlsx`);
}

export async function downloadCsvZip(cfg: DraftConfig) {
  const wb = generateWorkbook(cfg);
  const zip = new JSZip();
  const folder = zip.folder(getFilenameBase(cfg))!;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    folder.file(`${sheetName}.csv`, XLSX.utils.sheet_to_csv(ws));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${getFilenameBase(cfg)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
