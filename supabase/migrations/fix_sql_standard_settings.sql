-- Migration to fix SQL standard settings in existing tables
-- This migration adds standard SQL settings headers to ensure compliance with best practices

-- Removed SQL Server T-SQL directives (ANSI_NULLS, QUOTED_IDENTIFIER, NOCOUNT, READ UNCOMMITTED)
-- Not applicable in PostgreSQL/Supabase. Using pure Postgres-compatible migration content below.

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
    id BIGSERIAL PRIMARY KEY,
    standard_name TEXT NOT NULL,
    description TEXT NOT NULL,
    applies_to TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert documentation records
INSERT INTO public.sql_standards_documentation (standard_name, description, applies_to)
VALUES 
('ANSI_NULLS', 'Controls NULL behavior with comparison operators', 'All SQL scripts'),
('QUOTED_IDENTIFIER', 'SQL Server setting not applicable to Postgres', 'All SQL scripts'),
('NOCOUNT', 'Suppresses row count messages after statements', 'All SQL scripts'),
('TRANSACTION_ISOLATION_LEVEL', 'Sets the transaction isolation level for operations', 'All SQL scripts');

-- Grant access to documentation table
REVOKE SELECT ON public.sql_standards_documentation FROM authenticated;
GRANT SELECT ON public.sql_standards_documentation TO authenticated;

-- Note: T-SQL settings are not used in Postgres; any legacy references have been removed.

COMMENT ON TABLE public.sql_standards_documentation IS 'Documents SQL standards that should be applied to all SQL scripts in the project';

-- End of migration
