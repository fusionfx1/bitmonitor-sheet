# Budget Action Workflow

This workflow lets staff request budget changes without giving them direct Google Ads write access.

## Core Rule

BitMonitor Sheet Generator remains read-only for Google Ads reporting. It does not pause campaigns, edit budgets, or call any Google Ads mutate API.

Budget actions are handled as requests:

1. Staff review performance in the dashboard or raw tabs.
2. Staff create a budget action request in `_budget_action_requests`.
3. Owner reviews the request.
4. Owner approves or rejects in `_owner_approval_log`.
5. Only an owner-approved external execution path may apply the change, such as Optmyzr, owner Google Ads access, or a separately controlled write tool.

## Staff Can Do

- Review `raw_budget_daily`, `raw_campaign_daily`, and dashboard tabs.
- Create budget action requests.
- Mark request status as `REQUESTED`.
- Add evidence and notes.
- Report stale data or script errors.

## Staff Must Not Do

- Edit Google Ads budgets directly.
- Add mutate code to Google Ads Script.
- Deploy write-capable scripts.
- Approve their own requests.
- Reuse one Sheet across multiple Google Ads accounts.

## Required Tabs

| Tab | Purpose |
|---|---|
| `_settings_budget_actions` | Budget action workflow settings |
| `_budget_action_policy` | Owner approval rules for budget action requests |
| `_budget_action_requests` | Staff-entered budget action request queue |
| `_owner_approval_log` | Owner decision and execution audit log |

## Budget Request Statuses

| Status | Meaning |
|---|---|
| `DRAFT` | Staff is preparing the request |
| `REQUESTED` | Ready for owner review |
| `APPROVED` | Owner approved, ready for external execution |
| `REJECTED` | Owner rejected |
| `EXECUTED` | External approved tool applied the change |
| `CANCELLED` | Request cancelled |

## Recommended Approval Rule

Default policy:

- Maximum staff-requested increase: 10%
- Owner approval required: always
- Execution mode: request-only by default
- Google Ads Script exporter: read-only only

## Daily Operator Checklist

1. Check `_script_health`.
2. Check `_sync_runs` latest timestamp.
3. Check `_error_log`.
4. Review campaign performance.
5. If a budget change is needed, add one row to `_budget_action_requests`.
6. Set status to `REQUESTED`.
7. Notify owner with campaign name, requested percentage, reason, and evidence.

## Owner Checklist

1. Verify latest sync is fresh.
2. Review request reason and evidence.
3. Check current budget and requested budget.
4. Approve or reject in `_owner_approval_log`.
5. Execute through approved external write path only.
6. Record execution timestamp and tool name.
