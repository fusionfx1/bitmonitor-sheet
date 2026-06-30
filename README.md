# BitMonitor Sheet Generator

A browser-only web app for generating isolated Google Ads / BitMonitor Google Sheet templates.

## What It Does

BitMonitor Sheet Generator creates a ready-to-import Google Sheets workbook for a single Google Ads account. The workbook contains all configuration tabs, export job definitions, field manifests, GAQL safety rules, budget action request tabs, and placeholder rows that your Google Ads Script and Apps Script bridge need to operate.

All generation happens in your browser. No data is sent to any server.

## Staff Guides

- [Staff Setup Guide](docs/STAFF_SETUP_GUIDE.md)
- [Budget Action Workflow](docs/BUDGET_ACTION_WORKFLOW.md)

## Why 1 Account = 1 Sheet

Each Google Ads account must have its own dedicated Sheet. Sharing one Sheet across multiple accounts causes:

- Permission bleed between accounts
- Data contamination between accounts
- Unsafe test/production mixing
- Script authorization confusion

This rule is enforced in the app and documented in every generated workbook.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Generate an XLSX

1. Fill in **New Sheet** — choose template type, enter account nickname and Customer ID
2. Configure **Export Functions** — enable/disable each export job
3. Adjust **Script Settings**, **Bridge Settings**, **Dashboard Settings**, and **Budget Actions** as needed
4. Go to **Generate** — verify all validation checks pass
5. Click **Download .xlsx** (or **Download .csv.zip** for individual CSVs)

The filename format is: `bitmonitor-sheet-{nickname}-{customerid}-{YYYYMMDD}.xlsx`

## Import into Google Sheets

1. Create a new Google Sheet in the account owner's Google Drive
2. For each tab in the downloaded XLSX, create a matching tab in Google Sheets with the exact same name
3. Copy the header row and any data rows from the XLSX tab into the corresponding Google Sheets tab
4. Tab names must match exactly (case-sensitive)

## Connect Google Ads Script

1. In Google Ads, go to Tools > Bulk Actions > Scripts
2. Create a new script
3. Paste the full Google Ads Script Exporter from the **Generate** page
4. Replace `PASTE_GENERATED_SHEET_URL_HERE` with the URL of your Google Sheet
5. Authorize the script under the correct Google Ads account (matching `customer_id`)
6. Run once manually to verify — check `_script_health` tab for status

The generated exporter is read-only. It pulls Google Ads reports into the Sheet and must not contain `AdsApp.mutate`, budget update, pause, enable, or campaign edit actions.

## Budget Actions

Budget Actions are request/approval workflow tabs. They do not change Google Ads budgets by themselves.

Generated budget workflow tabs:

| Tab | Purpose |
|---|---|
| `_settings_budget_actions` | Budget action workflow settings |
| `_budget_action_policy` | Owner approval rules |
| `_budget_action_requests` | Staff budget change request queue |
| `_owner_approval_log` | Owner approval and execution audit log |

Default safety model:

- Staff may request budget changes.
- Owner approval is required.
- Execution is external and owner-controlled.
- The Google Ads Script Exporter remains read-only.

See [`docs/BUDGET_ACTION_WORKFLOW.md`](docs/BUDGET_ACTION_WORKFLOW.md) for the operator workflow.

## Connect Apps Script Bridge

1. Create an Apps Script project in your Google Drive
2. Paste the bridge snippet from the **Generate** page
3. Deploy as a Web App (Execute as: Me, Who has access: Anyone)
4. Copy the deployment URL into `BRIDGE_ENDPOINT_URL` in the `_settings_bridge` tab
5. Replace `BRIDGE_TOKEN_PLACEHOLDER` in `_settings_bridge` with a real secure token

## Security Notes

- **No real secrets are generated.** All token fields contain explicit placeholder values
- **Replace `BRIDGE_TOKEN_PLACEHOLDER`** with your own secure token after copying to Google Sheets
- **Never commit token values** to version control
- **No backend exists.** All generation is browser-local
- **Drafts are stored in localStorage only.** They never leave your browser
- **No external API calls** are made by this app
- **Budget action tabs are not a write API.** They are request/approval logs only

## Production Checklist

Before switching to `production` environment:

- [ ] Sheet is isolated — not shared with any other account
- [ ] `customer_id` matches the Google Ads account exactly
- [ ] `timezone` and `currency` are correct
- [ ] `BRIDGE_TOKEN_PLACEHOLDER` replaced with real token in Google Sheets
- [ ] Google Ads Script `SHEET_URL` points to this specific Sheet
- [ ] Script authorized under the correct Google Ads account
- [ ] Test run completed — `_script_health` shows no errors
- [ ] `_budget_action_policy` reviewed by owner
- [ ] `_qa_checklist` tab reviewed and all items checked

## Build and Test

```bash
npm run build   # production build
npm run lint    # lint check
npm run test    # run Vitest tests
```

## Template Types

| Type | Description |
|------|-------------|
| Google Ads Account Sheet | Standard account — all exports enabled |
| Test Account Sheet | Debug logs on, reduced max rows for safe testing |
| Manager/MCC Child Account Sheet | Includes MCC parent ID and child account flag |
| Empty Developer Sheet | No export jobs — for script development only |
