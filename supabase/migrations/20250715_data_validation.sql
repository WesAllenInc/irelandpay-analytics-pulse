-- Create table for storing validation reports
CREATE TABLE IF NOT EXISTS public.data_validation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type TEXT NOT NULL, -- 'merchants', 'residuals', 'agents'
    report_scope TEXT, -- Optional field for report scope (e.g., month for residuals)
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    total_records INTEGER DEFAULT 0,
    records_with_issues INTEGER DEFAULT 0,
    validation_timestamp TIMESTAMPTZ DEFAULT now(),
    execution_time_ms INTEGER, -- How long the validation took to run
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for detailed validation issues
CREATE TABLE IF NOT EXISTS public.data_validation_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.data_validation_reports(id) ON DELETE CASCADE,
    record_id TEXT NOT NULL, -- ID of the record with issues
    record_type TEXT NOT NULL, -- 'merchant', 'residual', 'agent'
    issue_type TEXT NOT NULL, -- 'missing', 'mismatch', 'duplicate', etc.
    issue_severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
    api_value JSONB, -- The value from the API
    db_value JSONB, -- The value from our database
    field_path TEXT, -- Path to the field with issues (if applicable)
    description TEXT, -- Human-readable description of the issue
    resolution_status TEXT DEFAULT 'open', -- 'open', 'resolved', 'ignored'
    resolved_at TIMESTAMPTZ,
    resolved_by UUID, -- User ID who resolved the issue
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS data_validation_reports_type_idx ON public.data_validation_reports(report_type);
CREATE INDEX IF NOT EXISTS data_validation_reports_status_idx ON public.data_validation_reports(status);
CREATE INDEX IF NOT EXISTS data_validation_issues_report_id_idx ON public.data_validation_issues(report_id);
CREATE INDEX IF NOT EXISTS data_validation_issues_record_id_idx ON public.data_validation_issues(record_id);
CREATE INDEX IF NOT EXISTS data_validation_issues_resolution_status_idx ON public.data_validation_issues(resolution_status);

-- Function to check data consistency (used by sync optimizer)
CREATE OR REPLACE FUNCTION public.check_data_consistency(
    p_data_type TEXT,
    p_sync_scope TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_records INTEGER,
    records_with_issues INTEGER,
    inconsistency_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.total_records,
        r.records_with_issues,
        CASE 
            WHEN r.total_records > 0 THEN 
                r.records_with_issues::NUMERIC / r.total_records::NUMERIC
            ELSE 
                0
        END AS inconsistency_rate
    FROM 
        public.data_validation_reports r
    WHERE 
        r.report_type = p_data_type
        AND (p_sync_scope IS NULL OR r.report_scope = p_sync_scope)
        AND r.status = 'completed'
    ORDER BY 
        r.validation_timestamp DESC
    LIMIT 1;
END;
$$;

-- Function to get change volume (used by sync optimizer)
CREATE OR REPLACE FUNCTION public.get_change_volume(
    p_data_type TEXT,
    p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_records INTEGER,
    changed_records INTEGER,
    change_volume NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_table_name TEXT;
    v_query TEXT;
    v_total INTEGER := 0;
    v_changed INTEGER := 0;
BEGIN
    -- Map data type to table name
    v_table_name := CASE 
        WHEN p_data_type = 'merchants' THEN 'merchants'
        WHEN p_data_type = 'residuals' THEN 'residuals'
        WHEN p_data_type = 'agents' THEN 'agents'
        ELSE p_data_type
    END;
    
    -- Get total record count
    EXECUTE format('SELECT COUNT(*) FROM public.%I', v_table_name) INTO v_total;
    
    -- Get changed record count if timestamp is provided
    IF p_since IS NOT NULL THEN
        EXECUTE format('
            SELECT COUNT(*)
            FROM public.%I
            WHERE last_modified_at >= $1
        ', v_table_name)
        USING p_since
        INTO v_changed;
    ELSE
        -- Default to 25% if no timestamp provided
        v_changed := v_total / 4;
    END IF;
    
    RETURN QUERY
    SELECT 
        v_total AS total_records,
        v_changed AS changed_records,
        CASE 
            WHEN v_total > 0 THEN 
                v_changed::NUMERIC / v_total::NUMERIC
            ELSE 
                0
        END AS change_volume;
END;
$$;

-- Function to create a new validation report
CREATE OR REPLACE FUNCTION public.create_validation_report(
    p_report_type TEXT,
    p_report_scope TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report_id UUID;
BEGIN
    INSERT INTO public.data_validation_reports (
        report_type,
        report_scope,
        status
    ) VALUES (
        p_report_type,
        p_report_scope,
        'pending'
    )
    RETURNING id INTO v_report_id;
    
    RETURN v_report_id;
END;
$$;

-- Function to update validation report status
CREATE OR REPLACE FUNCTION public.update_validation_report_status(
    p_report_id UUID,
    p_status TEXT,
    p_total_records INTEGER DEFAULT NULL,
    p_records_with_issues INTEGER DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.data_validation_reports
    SET 
        status = p_status,
        total_records = COALESCE(p_total_records, total_records),
        records_with_issues = COALESCE(p_records_with_issues, records_with_issues),
        execution_time_ms = COALESCE(p_execution_time_ms, execution_time_ms),
        validation_timestamp = CASE WHEN p_status = 'completed' THEN now() ELSE validation_timestamp END,
        updated_at = now()
    WHERE id = p_report_id;
    
    RETURN FOUND;
END;
$$;

-- Function to add a validation issue
CREATE OR REPLACE FUNCTION public.add_validation_issue(
    p_report_id UUID,
    p_record_id TEXT,
    p_record_type TEXT,
    p_issue_type TEXT,
    p_issue_severity TEXT,
    p_api_value JSONB DEFAULT NULL,
    p_db_value JSONB DEFAULT NULL,
    p_field_path TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_issue_id UUID;
BEGIN
    INSERT INTO public.data_validation_issues (
        report_id,
        record_id,
        record_type,
        issue_type,
        issue_severity,
        api_value,
        db_value,
        field_path,
        description
    ) VALUES (
        p_report_id,
        p_record_id,
        p_record_type,
        p_issue_type,
        p_issue_severity,
        p_api_value,
        p_db_value,
        p_field_path,
        p_description
    )
    RETURNING id INTO v_issue_id;
    
    RETURN v_issue_id;
END;
$$;

-- Function to resolve validation issue
CREATE OR REPLACE FUNCTION public.resolve_validation_issue(
    p_issue_id UUID,
    p_resolution_status TEXT,
    p_resolved_by UUID,
    p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.data_validation_issues
    SET 
        resolution_status = p_resolution_status,
        resolved_at = CASE WHEN p_resolution_status IN ('resolved', 'ignored') THEN now() ELSE NULL END,
        resolved_by = p_resolved_by,
        resolution_notes = p_resolution_notes
    WHERE id = p_issue_id;
    
    RETURN FOUND;
END;
$$;

-- View for validation report summaries
CREATE OR REPLACE VIEW public.validation_report_summaries AS
SELECT 
    r.id,
    r.report_type,
    r.report_scope,
    r.status,
    r.total_records,
    r.records_with_issues,
    CASE 
        WHEN r.total_records > 0 THEN 
            round((r.records_with_issues::NUMERIC / r.total_records::NUMERIC) * 100, 2)
        ELSE 
            0
    END AS issue_percentage,
    r.validation_timestamp,
    r.execution_time_ms,
    (
        SELECT COUNT(*) 
        FROM public.data_validation_issues i 
        WHERE i.report_id = r.id AND i.issue_severity = 'critical'
    ) AS critical_issues,
    (
        SELECT COUNT(*) 
        FROM public.data_validation_issues i 
        WHERE i.report_id = r.id AND i.issue_severity = 'high'
    ) AS high_issues,
    (
        SELECT COUNT(*) 
        FROM public.data_validation_issues i 
        WHERE i.report_id = r.id AND i.issue_severity = 'medium'
    ) AS medium_issues,
    (
        SELECT COUNT(*) 
        FROM public.data_validation_issues i 
        WHERE i.report_id = r.id AND i.issue_severity = 'low'
    ) AS low_issues,
    (
        SELECT COUNT(*) 
        FROM public.data_validation_issues i 
        WHERE i.report_id = r.id AND i.resolution_status = 'open'
    ) AS open_issues,
    (
        SELECT COUNT(*) 
        FROM public.data_validation_issues i 
        WHERE i.report_id = r.id AND i.resolution_status = 'resolved'
    ) AS resolved_issues,
    (
        SELECT COUNT(*) 
        FROM public.data_validation_issues i 
        WHERE i.report_id = r.id AND i.resolution_status = 'ignored'
    ) AS ignored_issues,
    r.created_at
FROM 
    public.data_validation_reports r
ORDER BY 
    r.validation_timestamp DESC;

-- View for open validation issues
CREATE OR REPLACE VIEW public.open_validation_issues AS
SELECT 
    i.id,
    i.report_id,
    r.report_type,
    r.report_scope,
    i.record_id,
    i.record_type,
    i.issue_type,
    i.issue_severity,
    i.field_path,
    i.description,
    i.api_value,
    i.db_value,
    i.created_at
FROM 
    public.data_validation_issues i
JOIN 
    public.data_validation_reports r ON i.report_id = r.id
WHERE 
    i.resolution_status = 'open'
ORDER BY 
    i.issue_severity,
    i.created_at DESC;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_validation_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_validation_issues TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_data_consistency TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_change_volume TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_validation_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_validation_report_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_validation_issue TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_validation_issue TO authenticated;
GRANT SELECT ON public.validation_report_summaries TO authenticated;
GRANT SELECT ON public.open_validation_issues TO authenticated;
