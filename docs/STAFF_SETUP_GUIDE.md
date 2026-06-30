# Staff Setup Guide: BitMonitor Sheet Generator

This guide explains how to create one Google Sheet per Google Ads account, install the Google Ads Script Exporter, verify data sync, and optionally connect the Apps Script Bridge for dashboard use.

---

## 1. Overview

BitMonitor Sheet Generator has four parts that work together:

- **Account Workbook** — a Google Sheet you create for one Google Ads account. It stores all settings and the data the Exporter pulls from Google Ads.
- **Google Ads Script Exporter** — a script that runs inside Google Ads and writes report data into the Sheet on a schedule.
- **Apps Script Bridge** — an optional web app that lets the BitMonitor dashboard read data from the Sheet.
- **Dashboard** — the BitMonitor app that displays synced data once everything is connected.

| Component | Required? | Where it lives | Purpose |
|---|---|---|---|
| Account Workbook | Yes | Google Sheets | Stores settings and exported Ads data |
| Google Ads Script Exporter | Yes | Google Ads Scripts | Pulls Google Ads reports into Sheet |
| Apps Script Bridge | Optional | Google Apps Script | Lets dashboard read Sheet |
| Dashboard | Optional | BitMonitor app | Displays synced data |

---

## 2. Golden Rule

```
1 Google Ads account = 1 Google Sheet
```

This rule is not optional.

- **Do not reuse one Sheet for multiple accounts.** Each account must have its own dedicated Sheet.
- **Do not share a Sheet between unrelated accounts.** Sharing causes data contamination and permission bleed.
- **Do not authorize the Exporter script under the wrong Google Ads account.** The Customer ID in the Sheet must exactly match the Google Ads account the script is authorized under.

If you are unsure whether a Sheet is already in use for another account, stop and ask your technical operator before continuing.

---

## 3. Before You Start

Gather the following before creating a workbook. Do not guess any of these values.

| Item | Where to find it |
|---|---|
| Google Ads Customer ID | Google Ads account — top right corner, format XXX-XXX-XXXX |
| Account nickname | Agreed team name for this account |
| Account owner email | The Google account that owns the Google Drive for this Sheet |
| Timezone | Account timezone in Google Ads settings |
| Currency | Account currency in Google Ads settings |
| Access to Google Ads | Confirm you can log in to the correct Google Ads account |
| Access to Google Drive | Confirm you can create a Sheet in the owner's Drive folder |

---

## 4. Step-by-Step: Create the Workbook

1. Open **BitMonitor Sheet Generator** in your browser.
2. Click **New Sheet** in the left sidebar.
3. Enter the **Account Nickname** (example: `Alpha Retail`).
4. Enter the **Customer ID** (example: `873-366-2880`). Include dashes.
5. Select the correct **Timezone**.
6. Select the correct **Currency**.
7. Set **Environment** to `test`. Do not change to `production` until your technical operator approves.
8. Click **Export Functions** in the sidebar.
9. Enable only the exports this account needs.
   - Default exports are fine for most accounts.
   - If the account has no Performance Max campaigns, disable all PMax exports.
   - If the account is small, the default max row limits are fine to leave as-is.
10. Click **Generate** in the sidebar.
11. Confirm all validation checks show green.
12. Click **Download XLSX**.

Save the downloaded file. You will need it in the next step.

---

## 5. Step-by-Step: Import Into Google Sheets

1. Open **Google Drive** while logged in as the account owner.
2. Create a new **blank Google Sheet** in the correct Drive folder.
3. Name the Sheet clearly. Use this format:
   ```
   BitMonitor - 873-366-2880 - Account Name
   ```
4. Import all tabs from the downloaded `.xlsx` file. In Google Sheets:
   - Go to **File > Import**
   - Upload the `.xlsx` file
   - Select **Insert new sheet(s)**
5. Confirm that every tab from the file now exists in the Sheet.
6. Make sure these tabs are present and named exactly as shown:

| Tab name | Purpose |
|---|---|
| `_settings_exporter` | Controls the Exporter script behavior |
| `_export_jobs` | Defines which export jobs run and their limits |
| `_script_health` | Logs script health status after each run |
| `_sync_runs` | Logs each completed sync run |
| `_error_log` | Logs errors encountered during runs |
| `raw_campaign_daily` | Campaign performance data |

7. **Do not delete, rename, or hide any tab that starts with an underscore (`_`).** These are system tabs the script reads at runtime.

---

## 6. Step-by-Step: Install the Google Ads Script Exporter

1. Open **Google Ads** and confirm you are in the correct account. The account Customer ID must match the one in your Sheet.
2. Go to **Tools > Bulk Actions > Scripts**.
3. Click the **+** button to create a new script. Name it clearly, for example: `BitMonitor Exporter - Alpha Retail`.
4. Return to **BitMonitor Sheet Generator** and go to the **Generate** page.
5. Under **Step 2: Install Google Ads Script Exporter**, click **Copy Full Google Ads Exporter Script**.
6. Return to the Google Ads script editor and **paste** the script into the editor, replacing any existing placeholder text.
7. Find the line that reads:
   ```
   SHEET_URL = "PASTE_GENERATED_SHEET_URL_HERE"
   ```
   Replace `PASTE_GENERATED_SHEET_URL_HERE` with the full URL of your Google Sheet. The URL should look like:
   ```
   https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXX/edit
   ```
8. Click **Save**.
9. Click **Authorize** and complete the authorization under the **correct Google Ads account**.
10. Click **Run** to run the script manually once.

> **Warning:** Do not paste the Apps Script Bridge into this editor. This step is for the Google Ads Script Exporter only.

> **Warning:** Confirm that the Google Ads account you are currently in matches the Customer ID you entered in the workbook. If they do not match, stop and create a new Sheet for the correct account.

---

## 7. Step-by-Step: Verify the First Run

After the manual run finishes, open the Google Sheet and check each of the following:

| Check | Where to look | What you should see |
|---|---|---|
| Script health | `_script_health` tab | A row with `status = OK` |
| Sync run log | `_sync_runs` tab | A new row added from this run |
| Error log | `_error_log` tab | No new rows with `ERROR` severity |
| Campaign data | `raw_campaign_daily` tab | Rows of data if the account has traffic |
| Search terms | `raw_search_terms_daily` tab | Rows of data if the job is enabled and data is available |

If `raw_campaign_daily` is empty:
- Check that the date range in `_settings_exporter` includes recent dates.
- Check that the account has had impressions in that date range.
- Check that the campaign export job is enabled in `_export_jobs`.
- Check `_error_log` for any error messages and report them.

If PMax tabs are empty:
- This is expected if the account has no Performance Max campaigns.
- You can disable PMax export jobs in **Export Functions** and regenerate the workbook.

Do not proceed to scheduling until all checks pass.

---

## 8. Step-by-Step: Set the Hourly Schedule

Only set a schedule after the manual run passes all checks in Step 7.

1. In Google Ads, go to **Tools > Bulk Actions > Scripts**.
2. Find the script you created.
3. Click the clock icon or **Set schedule**.
4. Set frequency to **Every hour**.
5. Click **Save**.
6. Note the next scheduled run time.
7. After the first scheduled run, return to the Sheet and confirm a new row appears in `_sync_runs`.

> Do not set a schedule if the manual run showed any errors. Fix errors first, then schedule.

---

## 9. Optional: Apps Script Bridge for Dashboard

The Bridge is optional. Only set it up if the BitMonitor dashboard needs to read data from this Sheet.

> If you have been told not to set up the Bridge yet, skip this section. Write in your notes: `Bridge setup pending.`

1. Open **Google Apps Script** at [script.google.com](https://script.google.com) while logged in as the account owner.
2. Click **New project**.
3. Name the project clearly, for example: `BitMonitor Bridge - Alpha Retail`.
4. Return to **BitMonitor Sheet Generator** and go to the **Generate** page.
5. Under **Step 4: Apps Script Bridge**, click **Copy Full Apps Script Bridge**.
6. Return to the Apps Script editor, select all existing code, and **paste** the copied script.
7. Find the line that reads:
   ```
   var SHEET_URL = "PASTE_GENERATED_SHEET_URL_HERE";
   ```
   Replace `PASTE_GENERATED_SHEET_URL_HERE` with the full URL of your Google Sheet.
8. Click **Save**.
9. Click **Deploy > New Deployment**.
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
10. Click **Deploy** and copy the **Deployment URL**.
11. Open your Google Sheet and go to the `_settings_bridge` tab.
12. Find the row for `BRIDGE_ENDPOINT_URL` and paste the deployment URL into the value column.
13. Find the row for `BRIDGE_TOKEN_PLACEHOLDER` and replace it with a secure token string. Use a long random string (example: `xK9mP2qL7rT4wN8v`). Do not use a simple word.
14. To confirm the Bridge works, open this URL in your browser:
    ```
    YOUR_DEPLOYMENT_URL?path=/health&token=YOUR_TOKEN
    ```
    You should see a JSON response with `"status": "ok"`.

> **Warning:** Do not paste the Apps Script Bridge into Google Ads Scripts.

> **Warning:** Do not paste the Google Ads Script Exporter into Google Apps Script.

> **Reminder:** The Bridge does not pull data from Google Ads. It only reads what is already in the Sheet. The Exporter must be running and syncing before the Bridge can return any data.

---

## 10. What Staff Can and Cannot Do

### Allowed

- Enable or disable export jobs in **Export Functions**
- Change max rows per job
- Change the date range or lookback window
- Set a campaign name filter to limit which campaigns are exported
- Change environment from `test` to `staging` or `production` **only when a technical operator approves it**
- Report errors or unexpected results

### Not Allowed

| Action | Why |
|---|---|
| Edit script code | Changes break predictable behavior |
| Change secrets or tokens without approval | Security risk |
| Share a Sheet across multiple accounts | Causes data contamination |
| Delete or rename system tabs | Script will fail to read config |
| Deploy backend or modify infrastructure | Outside staff scope |
| Change Google Ads campaign settings | Requires owner authorization |
| Add mutate code to any script | Scripts are read-only by design |

---

## 11. Troubleshooting

| Problem | Likely cause | What to check |
|---|---|---|
| Script says it cannot open the Sheet | Wrong `SHEET_URL` or the script account does not have read access | Verify the Sheet URL and share the Sheet with the script's Google account |
| `_script_health` shows an error status | A GAQL query or export job failed | Open `_error_log` and note the error message; escalate |
| No rows in raw tabs | No data in the date range, or jobs are disabled | Check date range in `_settings_exporter`, check `_export_jobs`, check account has impressions |
| Search terms tab is empty | Job disabled or no search term data available | Check `_export_jobs` — confirm `raw_search_terms_daily` is enabled |
| PMax tabs are empty | Account has no Performance Max campaigns | Disable PMax export jobs and regenerate |
| Dashboard shows no data | Bridge not connected, or Exporter has not synced recently | Check raw tabs for data first; then check Bridge `/health` endpoint |
| Dashboard shows stale data | Exporter stopped running or Bridge cache is stale | Check `_sync_runs` for last run time; check script schedule |
| Wrong account data appears | Script was authorized under the wrong Google Ads account | Stop the script. Create a new Sheet for the correct account and start over. Escalate immediately. |

---

## 12. Escalation Rules

You must stop what you are doing and contact your technical operator immediately if:

- Any row appears in `_error_log` with severity `ERROR`
- The Customer ID in the Sheet does not match the Google Ads account
- You discover the Sheet was shared with or used by the wrong account
- The Exporter script was pasted into Google Apps Script (wrong platform)
- The Apps Script Bridge was pasted into Google Ads Scripts (wrong platform)
- The dashboard shows no new data for more than 26 hours and the account is active
- You are unsure whether it is safe to change the environment to `production`
- You are asked to add any code that modifies, pauses, enables, or changes Google Ads campaign settings

Do not attempt to fix these issues yourself. Take a screenshot and report it.

---

## 13. Daily Operator Checklist

Run this check at the start of each working day for every active account:

- [ ] Open the Google Sheet for the account
- [ ] Open `_script_health` — confirm the latest row shows `OK`
- [ ] Open `_sync_runs` — confirm a row exists from within the last 2 hours
- [ ] Open `_error_log` — confirm no new `ERROR` rows since the last check
- [ ] Open `raw_campaign_daily` — confirm the data looks current
- [ ] If any check fails, take a screenshot and report it to your technical operator immediately

If an account consistently fails checks, do not just note it — escalate it.

---

## 14. Quick Reference

```
Exporter = Google Ads → Sheet
Bridge   = Sheet → Dashboard
Dashboard = View data

Google Ads Script Exporter  →  paste into: Google Ads > Scripts
Apps Script Bridge          →  paste into: Google Apps Script (script.google.com)
```

```
1 Google Ads account = 1 Google Sheet
Never share a Sheet across accounts
Never authorize the script under the wrong account
```

### Key tabs at a glance

| Tab | What it tells you |
|---|---|
| `_settings_exporter` | Current script configuration |
| `_export_jobs` | Which jobs are active and their row/date limits |
| `_script_health` | Pass/fail status of each run |
| `_sync_runs` | Timestamp and summary of every completed run |
| `_error_log` | Full error details — check here first when something goes wrong |
| `raw_campaign_daily` | Campaign data — confirms Exporter is working |
| `_settings_bridge` | Bridge endpoint URL and token — only if Bridge is installed |
