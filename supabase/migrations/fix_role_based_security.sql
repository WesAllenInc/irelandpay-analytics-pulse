-- Migration to fix role-based security issues
-- This migration creates proper role-based accounts and modifies grants accordingly

-- 1. Create role-based roles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated_role') THEN
    CREATE ROLE authenticated_role;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
    CREATE ROLE admin_role;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analyst_role') THEN
    CREATE ROLE analyst_role;
  END IF;
END;
$$;

-- 2. Grant the role-based roles to the built-in roles
GRANT authenticated_role TO authenticated;
GRANT admin_role TO service_role;

-- 3. Update permissions for master_data view (from 20250613_fix_security_definer_views.sql)
REVOKE SELECT ON public.master_data FROM authenticated;
GRANT SELECT ON public.master_data TO authenticated;

-- 4. Update permissions for merchant_data view (from 20250613_fix_security_definer_views.sql)
REVOKE SELECT ON public.merchant_data FROM authenticated;
GRANT SELECT ON public.merchant_data TO authenticated;

-- 5. Update permissions for merchant_volume view (from 20250613_fix_security_definer_views.sql)
REVOKE SELECT ON public.merchant_volume FROM authenticated;
GRANT SELECT ON public.merchant_volume TO authenticated;

-- 6. Update permissions for estimated_net_profit view (from 20250613_fix_security_definer_views.sql)
REVOKE SELECT ON public.estimated_net_profit FROM authenticated;
GRANT SELECT ON public.estimated_net_profit TO authenticated;

-- 7. Update permissions for sync_watermarks table (from 20250713_incremental_sync_tracking.sql)
REVOKE SELECT, INSERT, UPDATE ON public.sync_watermarks FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sync_watermarks TO authenticated;

-- 8. Update permissions for change_log view (from 20250713_incremental_sync_tracking.sql)
REVOKE SELECT ON public.change_log FROM authenticated;
GRANT SELECT ON public.change_log TO authenticated;

-- 9. Update permissions for sync_alerts table (from 20250712_sync_alerts_system.sql)
REVOKE SELECT ON public.sync_alerts FROM authenticated;
GRANT SELECT ON public.sync_alerts TO authenticated;

-- 10. Update permissions for alert_subscriptions table (from 20250712_sync_alerts_system.sql)
REVOKE SELECT, INSERT, UPDATE ON public.alert_subscriptions FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.alert_subscriptions TO authenticated;

-- 11. Update permissions for upcoming_sync_schedules view (from 20250714_sync_schedules.sql)
REVOKE SELECT ON public.upcoming_sync_schedules FROM authenticated;
GRANT SELECT ON public.upcoming_sync_schedules TO authenticated;

-- 12. Update permissions for sync_schedules table (from 20250714_sync_schedules.sql)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.sync_schedules FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_schedules TO authenticated;

-- 13. Update permissions for table_stats view (from 20250711_query_performance_monitoring.sql)
REVOKE SELECT ON public.table_stats FROM authenticated;
GRANT SELECT ON public.table_stats TO authenticated;

-- 14. Update permissions for slow_queries view (from 20250711_query_performance_monitoring.sql)
REVOKE SELECT ON public.slow_queries FROM authenticated;
GRANT SELECT ON public.slow_queries TO authenticated;

-- 15. Update permissions for data_validation_issues table (from 20250715_data_validation.sql)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.data_validation_issues FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_validation_issues TO authenticated;

-- 16. Update permissions for data_validation_reports table (from 20250715_data_validation.sql)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.data_validation_reports FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_validation_reports TO authenticated;

-- 17. Update permissions for validation_report_summaries view (from 20250715_data_validation.sql)
REVOKE SELECT ON public.validation_report_summaries FROM authenticated;
GRANT SELECT ON public.validation_report_summaries TO authenticated;

-- 18. Update permissions for open_validation_issues view (from 20250715_data_validation.sql)
REVOKE SELECT ON public.open_validation_issues FROM authenticated;
GRANT SELECT ON public.open_validation_issues TO authenticated;

-- 19. Update permissions for data_freshness view (from 20250709_add_data_freshness.sql)
REVOKE SELECT ON public.data_freshness FROM authenticated;
GRANT SELECT ON public.data_freshness TO authenticated;

-- 20. Update permissions for sync_queue table (from 20250708_add_sync_queue_tables.sql)
REVOKE SELECT ON public.sync_queue FROM authenticated;
GRANT SELECT ON public.sync_queue TO authenticated;

-- NOTE: After applying this migration, you may need to update application code that 
-- relies on the authenticated role having direct access to these tables/views
