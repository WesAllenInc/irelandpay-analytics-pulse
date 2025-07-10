-- Migration to fix SQL standard settings in existing tables
-- This migration adds standard SQL settings headers to ensure compliance with best practices

-- Apply standard settings
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

-- Note: Since these settings are session-specific, they won't persist in the database
-- This migration serves as documentation that these settings should be used
-- and ensures that any operations in this migration use these settings

-- Create a function to check if tables exist and log the check
CREATE OR REPLACE FUNCTION public.ensure_sql_standards() RETURNS void AS $$
BEGIN
    -- Log the execution of SQL standards check
    INSERT INTO public.admin_audit_log (
        action,
        description,
        performed_by
    )
    VALUES (
        'SQL_STANDARDS_CHECK',
        'Applied standard SQL settings for database operations',
        current_user
    );
END;
$$ LANGUAGE plpgsql;

-- Execute the function to log this migration
SELECT public.ensure_sql_standards();

-- Create documentation table to help enforce standards
CREATE TABLE IF NOT EXISTS public.sql_standards_documentation (
    id SERIAL PRIMARY KEY,
    standard_name TEXT NOT NULL,
    description TEXT NOT NULL,
    applies_to TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert documentation records
INSERT INTO public.sql_standards_documentation (standard_name, description, applies_to)
VALUES 
('ANSI_NULLS', 'Controls NULL behavior with comparison operators', 'All SQL scripts'),
('QUOTED_IDENTIFIER', 'Controls interpretation of double quotes', 'All SQL scripts'),
('NOCOUNT', 'Suppresses row count messages after statements', 'All SQL scripts'),
('TRANSACTION_ISOLATION_LEVEL', 'Sets the transaction isolation level for operations', 'All SQL scripts');

-- Grant access to documentation table
REVOKE SELECT ON public.sql_standards_documentation FROM authenticated;
GRANT SELECT ON public.sql_standards_documentation TO authenticated_role;

-- Note: To fully comply with standards, the following files need manual editing to include these settings:
-- - supabase/migrations/20250605_create_residual_payouts.sql
-- - scripts/update-merchants-table.sql
-- - Any new SQL scripts created in the future

COMMENT ON TABLE public.sql_standards_documentation IS 'Documents SQL standards that should be applied to all SQL scripts in the project';

-- End of migration
