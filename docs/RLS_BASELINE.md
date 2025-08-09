### RLS Baseline and Policies

This document summarizes Row Level Security (RLS) enablement and policies per `public` table.

- Agents
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `agents_select_own` (select): admin or users whose `users.agent_id` matches `agents.id`

- Merchants
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `merchants_select_scoped` (select): admin or merchants where `agent_id` matches requestor's `users.agent_id`

- Residuals
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `residuals_select_scoped` (select): admin or records where related merchant belongs to requestor's `users.agent_id`

- Merchant Processing Volumes
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `mpv_select_scoped` (select): admin or records where related merchant belongs to requestor's `users.agent_id`

- Residual Payouts
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated` (no DML)
  - Policies:
    - `residual_payouts_select_scoped` (select): admin or by `mid` mapped to a merchant whose `agent_id` equals requestor's `users.agent_id`

- Users
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `users_select_self` (select): admin or `id = auth.uid()`

- Alert Subscriptions
  - RLS: enabled and forced
  - Grants: SELECT, INSERT, UPDATE, DELETE to `authenticated`
  - Policies:
    - `alert_subscriptions_select_own` (select): `auth.uid() = user_id` or admin
    - `alert_subscriptions_insert_own` (insert): `auth.uid() = user_id` or admin
    - `alert_subscriptions_update_own` (update): `auth.uid() = user_id` or admin
    - `alert_subscriptions_delete_own` (delete): `auth.uid() = user_id` or admin

- Sync Alerts
  - RLS: enabled and forced
  - Grants: SELECT, UPDATE to `authenticated`
  - Policies:
    - `sync_alerts_select_all` (select): all authenticated
    - `sync_alerts_update_ack` (update): acknowledger or admin
  - Insert/Delete: via RPC or service role only

- Data Validation Reports / Issues
  - RLS: enabled and forced
  - Grants: SELECT, INSERT, UPDATE, DELETE to `authenticated`
  - Policies:
    - `dvr_admin_only` (all): admin-only
    - `dvi_admin_only` (all): admin-only

- Sync Core (sync_jobs, sync_progress, sync_failed_items)
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `sync_jobs_admin_read` (select): admin-only
    - `sync_progress_admin_read` (select): admin-only
    - `sync_failed_items_admin_read` (select): admin-only
  - Mutations: via RPC/service role only

- Sync Queue
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `sync_queue_admin_read` (select): admin-only
  - Mutations: RPC/service role only

- Schedules (sync_schedules)
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `sync_schedules_admin_read` (select): admin-only

- Incremental Sync Helpers (sync_watermarks, change_log)
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `sync_watermarks_admin_read` (select): admin-only
    - `change_log_admin_read` (select): admin-only

- Ingestion Logs
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `ingestion_logs_admin_read` (select): admin-only

- Legacy Summary Tables (merchant_data, residual_data) [if present]
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - Scoped by `users.agent_id` via merchant mapping; admin can read all

- Merchant Profitability [if present]
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - `merchant_profitability_admin_read` (select): admin-only

- Monthly Forecasts / Profit Leakage
  - RLS: enabled and forced
  - Grants: SELECT to `authenticated`
  - Policies:
    - Scoped by `users.agent_id` via merchant mapping; admin can read all

- API Credentials / User Roles
  - RLS: enabled and forced
  - Grants: none to `authenticated`
  - Policies:
    - Service role/RPC access only

Admin/service operations should use RPCs with SECURITY DEFINER or the service role key, which bypasses RLS.


