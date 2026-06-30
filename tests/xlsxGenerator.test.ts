import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { generateWorkbook, getFilenameBase, RAW_HEADERS } from '../src/xlsxGenerator';
import { createDefaultDraft, applyTemplateDefaults, SHEET_TABS } from '../src/constants';

const ALL_REQUIRED_TABS = [
  // Core
  'README', '_settings_global', '_settings_account', '_settings_exporter',
  '_settings_bridge', '_settings_dashboard', '_export_jobs', '_tab_manifest',
  '_field_manifest', '_gaql_compatibility_matrix', '_qa_checklist',
  '_script_health', '_sync_runs', '_error_log',
  // Raw
  'raw_account_daily', 'raw_campaign_daily', 'raw_ad_group_daily',
  'raw_keyword_daily', 'raw_search_terms_daily', 'raw_pmax_asset_group_daily',
  'raw_pmax_terms_daily', 'raw_geo_daily', 'raw_device_daily',
  'raw_conversion_action_daily', 'raw_budget_daily', 'raw_change_history_daily',
  // Dashboard
  'dashboard_summary_daily', 'dashboard_campaign_daily', 'dashboard_pmax_daily',
  'dashboard_geo_daily', 'dashboard_terms_daily', 'dashboard_conversion_daily',
  // Mapping
  'map_accounts', 'map_campaigns', 'map_ad_groups',
  'map_conversion_actions', 'map_geo_targets', 'map_channels',
];

function getSheetFirstRow(wb: ReturnType<typeof generateWorkbook>, tabName: string): string[] {
  const ws = wb.Sheets[tabName];
  if (!ws) return [];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  return (data[0] ?? []).map(String);
}

function getSheetRows(wb: ReturnType<typeof generateWorkbook>, tabName: string): string[][] {
  const ws = wb.Sheets[tabName];
  if (!ws) return [];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  return data.map(r => (r as unknown[]).map(String));
}

describe('generateWorkbook', () => {
  it('includes all required tabs', () => {
    const cfg = createDefaultDraft({ accountNickname: 'test', customerId: '1234567890' });
    const wb = generateWorkbook(cfg);
    for (const tab of ALL_REQUIRED_TABS) {
      expect(wb.SheetNames, `missing tab: ${tab}`).toContain(tab);
    }
  });

  it('_settings_global includes all required keys', () => {
    const cfg = createDefaultDraft({ accountNickname: 'TestAcc', customerId: '111-222-3333' });
    const wb = generateWorkbook(cfg);
    const rows = getSheetRows(wb, '_settings_global');
    const keys = rows.slice(1).map(r => r[0]);
    const requiredKeys = [
      'customer_id', 'account_name', 'timezone', 'currency', 'environment',
      'sheet_version', 'script_version', 'ads_api_version', 'owner_email',
      'enable_debug_logs', 'default_lookback_days', 'default_max_rows', 'default_write_mode',
    ];
    for (const k of requiredKeys) {
      expect(keys, `_settings_global missing key: ${k}`).toContain(k);
    }
  });

  it('_settings_exporter includes all required keys', () => {
    const cfg = createDefaultDraft({ accountNickname: 'TestAcc', customerId: '123456789' });
    const wb = generateWorkbook(cfg);
    const rows = getSheetRows(wb, '_settings_exporter');
    const keys = rows.slice(1).map(r => r[0]);
    const requiredKeys = [
      'GOOGLE_ADS_CUSTOMER_ID', 'DATE_RANGE_MODE', 'LOOKBACK_DAYS',
      'MAX_ROWS', 'MAX_ROWS_PMAX', 'MAX_ROWS_TERMS', 'WRITE_MODE',
      'INCLUDE_ZERO_IMPRESSIONS', 'LOG_LEVEL',
    ];
    for (const k of requiredKeys) {
      expect(keys, `_settings_exporter missing key: ${k}`).toContain(k);
    }
  });

  it('_export_jobs includes every export function', () => {
    const cfg = createDefaultDraft({ accountNickname: 'test', customerId: '123' });
    const wb = generateWorkbook(cfg);
    const rows = getSheetRows(wb, '_export_jobs');
    const jobKeys = rows.slice(1).map(r => r[1]);
    for (const fn of cfg.exportFunctions) {
      expect(jobKeys, `_export_jobs missing job: ${fn.function_key}`).toContain(fn.function_key);
    }
  });

  it('_gaql_compatibility_matrix includes known GAQL safety rules', () => {
    const cfg = createDefaultDraft({ accountNickname: 'test', customerId: '123' });
    const wb = generateWorkbook(cfg);
    const rows = getSheetRows(wb, '_gaql_compatibility_matrix');
    const allText = rows.flat().join(' ');
    expect(allText).toContain('asset_interaction_target.asset');
    expect(allText).toContain('campaign_search_term_view.status');
    expect(allText).toContain('geo_target_country');
    expect(allText).toContain('change_event');
  });

  it('empty_developer template generates workbook with zero enabled export jobs', () => {
    const cfg = applyTemplateDefaults(
      createDefaultDraft({ accountNickname: 'dev', customerId: '999' }),
      'empty_developer',
    );
    expect(cfg.exportFunctions.every(f => !f.enabled)).toBe(true);
    const wb = generateWorkbook(cfg);
    expect(wb.SheetNames).toContain('_export_jobs');
    expect(wb.SheetNames.length).toBeGreaterThan(10);
  });

  it('generated filename follows correct format', () => {
    const cfg = createDefaultDraft({ accountNickname: 'My Account', customerId: '123-456-7890' });
    const base = getFilenameBase(cfg);
    expect(base).toMatch(/^bitmonitor-sheet-my_account-1234567890-\d{8}$/);
  });

  it('raw_account_daily tab has correct headers', () => {
    const cfg = createDefaultDraft({ accountNickname: 'test', customerId: '123' });
    const wb = generateWorkbook(cfg);
    const firstRow = getSheetFirstRow(wb, 'raw_account_daily');
    expect(firstRow).toContain('sync_run_id');
    expect(firstRow).toContain('date');
    expect(firstRow).toContain('customer_id');
    expect(firstRow).toContain('impressions');
    expect(firstRow).toContain('clicks');
    expect(firstRow).toContain('cost_micros');
    expect(firstRow).toContain('conversions');
  });

  it('raw_campaign_daily tab has correct headers', () => {
    const cfg = createDefaultDraft({ accountNickname: 'test', customerId: '123' });
    const wb = generateWorkbook(cfg);
    const firstRow = getSheetFirstRow(wb, 'raw_campaign_daily');
    expect(firstRow).toContain('campaign_id');
    expect(firstRow).toContain('campaign_name');
    expect(firstRow).toContain('campaign_status');
    expect(firstRow).toContain('advertising_channel_type');
  });

  it('raw_keyword_daily tab has correct headers', () => {
    const cfg = createDefaultDraft({ accountNickname: 'test', customerId: '123' });
    const wb = generateWorkbook(cfg);
    const firstRow = getSheetFirstRow(wb, 'raw_keyword_daily');
    expect(firstRow).toContain('keyword_text');
    expect(firstRow).toContain('match_type');
    expect(firstRow).toContain('quality_score');
    expect(firstRow).toContain('criterion_id');
  });

  it('raw_change_history_daily tab has correct headers', () => {
    const cfg = createDefaultDraft({ accountNickname: 'test', customerId: '123' });
    const wb = generateWorkbook(cfg);
    const firstRow = getSheetFirstRow(wb, 'raw_change_history_daily');
    expect(firstRow).toContain('change_date_time');
    expect(firstRow).toContain('user_email');
    expect(firstRow).toContain('change_resource_type');
    expect(firstRow).toContain('changed_fields');
  });

  it('_settings_account includes mcc fields', () => {
    const cfg = applyTemplateDefaults(
      createDefaultDraft({ accountNickname: 'child', customerId: '999', mccParentCustomerId: '111' }),
      'mcc_child',
    );
    const wb = generateWorkbook(cfg);
    const rows = getSheetRows(wb, '_settings_account');
    const keys = rows.slice(1).map(r => r[0]);
    expect(keys).toContain('is_mcc_child_account');
    expect(keys).toContain('mcc_parent_customer_id');
  });

  it('test_account template has debug logs enabled and reduced max rows', () => {
    const cfg = applyTemplateDefaults(
      createDefaultDraft({ accountNickname: 'test', customerId: '555' }),
      'test_account',
    );
    expect(cfg.enableDebugLogs).toBe(true);
    expect(cfg.maxRowsDefault).toBeLessThanOrEqual(1000);
    expect(cfg.maxRowsPmax).toBeLessThanOrEqual(500);
  });

  it('SHEET_TABS constant covers all 38 required tabs', () => {
    const total = SHEET_TABS.core.length + SHEET_TABS.rawData.length +
      SHEET_TABS.dashboard.length + SHEET_TABS.mapping.length;
    expect(total).toBe(38);
  });

  it('RAW_HEADERS covers all 12 raw data tabs', () => {
    const rawTabNames = SHEET_TABS.rawData.map(t => t.tab);
    for (const tab of rawTabNames) {
      expect(Object.keys(RAW_HEADERS), `RAW_HEADERS missing: ${tab}`).toContain(tab);
    }
  });
});
