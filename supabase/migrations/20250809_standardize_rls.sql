-- Standardize Row Level Security (RLS) across all user-facing tables
-- Date: 2025-08-09

-- Helper: consistent admin check
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.revoked_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    );
$$;

-- 1) Enable and FORCE RLS on every table in public schema and revoke default grants
DO $$
DECLARE r RECORD; pol RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon, authenticated', r.schemaname, r.tablename);

    -- Drop existing policies to avoid conflicts; we will recreate canonical ones below
    FOR pol IN
      SELECT polname
      FROM pg_policies
      WHERE schemaname = r.schemaname AND tablename = r.tablename
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.polname, r.schemaname, r.tablename);
    END LOOP;
  END LOOP;
END
$$;

-- 2) Canonical policies and minimal grants per table

-- Ensure minimal schema usage
GRANT USAGE ON SCHEMA public TO authenticated;

-- Agents: users can read only their own agent row; admins can read all
GRANT SELECT ON TABLE public.agents TO authenticated;
CREATE POLICY agents_select_own ON public.agents
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin() OR
    id = (SELECT u.agent_id FROM public.users u WHERE u.id = auth.uid())
  );

-- Merchants: users can read merchants tied to their agent; admins can read all
GRANT SELECT ON TABLE public.merchants TO authenticated;
CREATE POLICY merchants_select_scoped ON public.merchants
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin() OR
    agent_id = (SELECT u.agent_id FROM public.users u WHERE u.id = auth.uid())
  );

-- Residuals: readable when merchant belongs to user's agent; admins can read all
GRANT SELECT ON TABLE public.residuals TO authenticated;
CREATE POLICY residuals_select_scoped ON public.residuals
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = residuals.merchant_id
        AND m.agent_id = (SELECT u.agent_id FROM public.users u WHERE u.id = auth.uid())
    )
  );

-- Merchant processing volumes: readable when merchant belongs to user's agent; admins can read all
GRANT SELECT ON TABLE public.merchant_processing_volumes TO authenticated;
CREATE POLICY mpv_select_scoped ON public.merchant_processing_volumes
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = merchant_processing_volumes.merchant_id
        AND m.agent_id = (SELECT u.agent_id FROM public.users u WHERE u.id = auth.uid())
    )
  );

-- Residual payouts: readable when merchant (by mid) belongs to user's agent; admins can read all
GRANT SELECT ON TABLE public.residual_payouts TO authenticated;
CREATE POLICY residual_payouts_select_scoped ON public.residual_payouts
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.merchant_id = residual_payouts.mid
        AND m.agent_id = (SELECT u.agent_id FROM public.users u WHERE u.id = auth.uid())
    )
  );

-- Users: read own user profile; admins can read all
GRANT SELECT ON TABLE public.users TO authenticated;
CREATE POLICY users_select_self ON public.users
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin() OR id = auth.uid());

-- Alert subscriptions: per-user CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alert_subscriptions TO authenticated;
CREATE POLICY alert_subscriptions_select_own ON public.alert_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.current_user_is_admin());
CREATE POLICY alert_subscriptions_insert_own ON public.alert_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.current_user_is_admin());
CREATE POLICY alert_subscriptions_update_own ON public.alert_subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.current_user_is_admin())
  WITH CHECK (auth.uid() = user_id OR public.current_user_is_admin());
CREATE POLICY alert_subscriptions_delete_own ON public.alert_subscriptions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.current_user_is_admin());

-- Sync alerts: read for all authenticated; acknowledge/update by acknowledger or admin; inserts via service role/RPC only
GRANT SELECT, UPDATE ON TABLE public.sync_alerts TO authenticated;
CREATE POLICY sync_alerts_select_all ON public.sync_alerts
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY sync_alerts_update_ack ON public.sync_alerts
  FOR UPDATE TO authenticated
  USING (public.current_user_is_admin() OR auth.uid() = acknowledged_by)
  WITH CHECK (public.current_user_is_admin() OR auth.uid() = acknowledged_by);

-- Data validation tables: admin-only through policies (grant select for role, predicate restricts)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.data_validation_reports TO authenticated;
CREATE POLICY dvr_admin_only ON public.data_validation_reports
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.data_validation_issues TO authenticated;
CREATE POLICY dvi_admin_only ON public.data_validation_issues
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Sync core tables: admin-only
GRANT SELECT ON TABLE public.sync_jobs TO authenticated;
CREATE POLICY sync_jobs_admin_read ON public.sync_jobs
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

GRANT SELECT ON TABLE public.sync_progress TO authenticated;
CREATE POLICY sync_progress_admin_read ON public.sync_progress
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

GRANT SELECT ON TABLE public.sync_failed_items TO authenticated;
CREATE POLICY sync_failed_items_admin_read ON public.sync_failed_items
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- Sync queue: read-only for admins; mutations via RPC or service role
GRANT SELECT ON TABLE public.sync_queue TO authenticated;
CREATE POLICY sync_queue_admin_read ON public.sync_queue
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- Schedules: admin-only
GRANT SELECT ON TABLE public.sync_schedules TO authenticated;
CREATE POLICY sync_schedules_admin_read ON public.sync_schedules
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- Sync config: admin-only read/write
GRANT SELECT, UPDATE ON TABLE public.sync_config TO authenticated;
CREATE POLICY sync_config_admin_read ON public.sync_config
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());
CREATE POLICY sync_config_admin_update ON public.sync_config
  FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Incremental sync helper tables
GRANT SELECT ON TABLE public.sync_watermarks TO authenticated;
CREATE POLICY sync_watermarks_admin_read ON public.sync_watermarks
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

GRANT SELECT ON TABLE public.change_log TO authenticated;
CREATE POLICY change_log_admin_read ON public.change_log
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- Ingestion logs: admin-only
GRANT SELECT ON TABLE public.ingestion_logs TO authenticated;
CREATE POLICY ingestion_logs_admin_read ON public.ingestion_logs
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- Merchant summary/legacy tables: scope by agent when possible
-- merchant_data
DO $$
BEGIN
  IF to_regclass('public.merchant_data') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.merchant_data TO authenticated;
    CREATE POLICY merchant_data_select_scoped ON public.merchant_data
      FOR SELECT TO authenticated
      USING (
        public.current_user_is_admin() OR
        EXISTS (
          SELECT 1 FROM public.merchants m
          WHERE m.merchant_id = merchant_data.mid
            AND m.agent_id = (SELECT u.agent_id FROM public.users u WHERE u.id = auth.uid())
        )
      );
  END IF;
END $$;

-- residual_data
DO $$
BEGIN
  IF to_regclass('public.residual_data') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.residual_data TO authenticated;
    CREATE POLICY residual_data_select_scoped ON public.residual_data
      FOR SELECT TO authenticated
      USING (
        public.current_user_is_admin() OR
        EXISTS (
          SELECT 1 FROM public.merchants m
          WHERE m.merchant_id = residual_data.mid
            AND m.agent_id = (SELECT u.agent_id FROM public.users u WHERE u.id = auth.uid())
        )
      );
  END IF;
END $$;

-- Merchant profitability (if present): admin-only by default
DO $$
BEGIN
  IF to_regclass('public.merchant_profitability') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.merchant_profitability TO authenticated;
    CREATE POLICY merchant_profitability_admin_read ON public.merchant_profitability
      FOR SELECT TO authenticated
      USING (public.current_user_is_admin());
  END IF;
END $$;

-- Monthly forecasts / Profit leakage: scope by agent
GRANT SELECT ON TABLE public.monthly_forecasts TO authenticated;
CREATE POLICY monthly_forecasts_select_scoped ON public.monthly_forecasts
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = monthly_forecasts.merchant_id
        AND m.agent_id = (SELECT u.agent_id FROM public.users u WHERE u.id = auth.uid())
    )
  );

GRANT SELECT ON TABLE public.profit_leakage TO authenticated;
CREATE POLICY profit_leakage_select_scoped ON public.profit_leakage
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = profit_leakage.merchant_id
        AND m.agent_id = (SELECT u.agent_id FROM public.users u WHERE u.id = auth.uid())
    )
  );

-- Admin/system-only tables: no grants/policies for authenticated beyond what is needed for admin via policy
-- api_credentials and user_roles remain service-role managed only; do not grant to authenticated
-- sql_standards_documentation: admin-only
GRANT SELECT ON TABLE public.sql_standards_documentation TO authenticated;
CREATE POLICY sql_standards_documentation_admin_read ON public.sql_standards_documentation
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- 3) Clean up overly permissive legacy policies on residual_payouts if any existed (already dropped above) and avoid DML grants to authenticated
REVOKE INSERT, UPDATE, DELETE ON TABLE public.residual_payouts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.merchants FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.residuals FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.merchant_processing_volumes FROM authenticated;

-- Note:
-- - Admin/service-side DML should use RPCs with SECURITY DEFINER or the service role key which bypasses RLS.
-- - This migration standardizes RLS and policies, relying on predicates for data scoping.


