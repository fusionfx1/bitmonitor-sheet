export type TemplateType =
  | 'google_ads_account'
  | 'test_account'
  | 'mcc_child'
  | 'empty_developer';

export type Environment = 'test' | 'staging' | 'production';

export type DateRangeMode =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_14_DAYS'
  | 'LAST_30_DAYS'
  | 'CUSTOM';

export type WriteMode = 'append' | 'overwrite' | 'upsert';

export interface ExportFunction {
  enabled: boolean;
  function_key: string;
  display_name: string;
  destination_tab: string;
  date_grain: string;
  max_rows: number;
  lookback_days_override: number | null;
  write_mode: WriteMode;
  status: string;
  notes: string;
  gaql_resource_rule: string;
  compatibility_notes: string;
}

export interface DraftConfig {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  templateType: TemplateType;
  accountNickname: string;
  customerId: string;
  timezone: string;
  currency: string;
  ownerEmail: string;
  environment: Environment;
  lookbackDays: number;
  exportScheduleNote: string;
  dashboardProjectName: string;
  accountId: string;
  accountName: string;
  sheetVersion: string;
  scriptVersion: string;
  adsApiVersion: string;
  maxRowsDefault: number;
  maxRowsPmax: number;
  maxRowsTerms: number;
  dateRangeMode: DateRangeMode;
  writeMode: WriteMode;
  includeZeroImpressions: boolean;
  includeRemovedEntities: boolean;
  enableDebugLogs: boolean;
  exportFunctions: ExportFunction[];
  // Bridge settings
  bridgeEnabled: boolean;
  bridgeTokenPlaceholder: string;
  bridgeEndpointUrl: string;
  dashboardImportMode: string;
  allowGet: boolean;
  allowPost: boolean;
  enableHealthEndpoint: boolean;
  enableCsvExport: boolean;
  enableJsonExport: boolean;
  enableCache: boolean;
  cacheSeconds: number;
  logBridgeRequests: boolean;
  // Dashboard settings
  dashboardEnabled: boolean;
  dashboardAccountName: string;
  dashboardRefreshIntervalMinutes: number;
  showLastSyncCard: boolean;
  showScriptHealthCard: boolean;
  showCampaignTable: boolean;
  showPmaxTable: boolean;
  showSearchTermsTable: boolean;
  showGeoTable: boolean;
  showConversionTable: boolean;
  alertIfSyncOlderThanHours: number;
  alertIfScriptErrorCountGt: number;
  alertIfCostSpikePercentGt: number;
  alertIfConversionDropPercentGt: number;
}
