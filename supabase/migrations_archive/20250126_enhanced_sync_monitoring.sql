-- Enhanced Sync Monitoring Tables
-- This migration adds comprehensive sync job tracking, progress monitoring, and error recovery

-- Create sync jobs table for tracking all sync operations
CREATE TABLE IF NOT EXISTS public.sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL CHECK (sync_type IN ('initial', 'daily', 'manual', 'historical')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    triggered_by TEXT NOT NULL CHECK (triggered_by IN ('schedule', 'manual', 'api', 'setup')),
    triggered_by_user_id UUID REFERENCES auth.users(id),
    progress JSONB DEFAULT '{}'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    error_details JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create sync progress table for real-time updates
CREATE TABLE IF NOT EXISTS public.sync_progress (
    sync_id UUID PRIMARY KEY REFERENCES sync_jobs(id) ON DELETE CASCADE,
    phase TEXT NOT NULL,
    progress NUMERIC(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    message TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    last_update TIMESTAMPTZ DEFAULT now()
);

-- Create failed items table for recovery
CREATE TABLE IF NOT EXISTS public.sync_failed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id UUID REFERENCES sync_jobs(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('merchant', 'transaction', 'residual', 'volume')),
    item_id TEXT NOT NULL,
    error_details JSONB NOT NULL,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_type ON sync_jobs(sync_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_triggered_by ON sync_jobs(triggered_by, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user ON sync_jobs(triggered_by_user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_progress_phase ON sync_progress(phase);
CREATE INDEX IF NOT EXISTS idx_sync_progress_last_update ON sync_progress(last_update DESC);

CREATE INDEX IF NOT EXISTS idx_sync_failed_items_unresolved ON sync_failed_items(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_failed_items_type ON sync_failed_items(item_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_failed_items_sync ON sync_failed_items(sync_id, created_at DESC);

-- Create functions for sync job management
CREATE OR REPLACE FUNCTION public.create_sync_job(
    p_sync_type TEXT,
    p_triggered_by TEXT,
    p_triggered_by_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job_id UUID;
BEGIN
    INSERT INTO sync_jobs (
        sync_type,
        status,
        triggered_by,
        triggered_by_user_id,
        metadata
    ) VALUES (
        p_sync_type,
        'pending',
        p_triggered_by,
        p_triggered_by_user_id,
        p_metadata
    ) RETURNING id INTO v_job_id;
    
    RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_sync_progress(
    p_sync_id UUID,
    p_phase TEXT,
    p_progress NUMERIC,
    p_message TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO sync_progress (
        sync_id,
        phase,
        progress,
        message,
        details,
        last_update
    ) VALUES (
        p_sync_id,
        p_phase,
        p_progress,
        p_message,
        p_details,
        now()
    )
    ON CONFLICT (sync_id) DO UPDATE SET
        phase = EXCLUDED.phase,
        progress = EXCLUDED.progress,
        message = EXCLUDED.message,
        details = EXCLUDED.details,
        last_update = now();
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_sync_job(
    p_sync_id UUID,
    p_status TEXT,
    p_results JSONB DEFAULT '{}'::jsonb,
    p_error_details JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE sync_jobs
    SET 
        status = p_status,
        completed_at = now(),
        results = p_results,
        error_details = p_error_details,
        updated_at = now()
    WHERE id = p_sync_id;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_failed_item(
    p_sync_id UUID,
    p_item_type TEXT,
    p_item_id TEXT,
    p_error_details JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_failed_item_id UUID;
BEGIN
    INSERT INTO sync_failed_items (
        sync_id,
        item_type,
        item_id,
        error_details
    ) VALUES (
        p_sync_id,
        p_item_type,
        p_item_id,
        p_error_details
    ) RETURNING id INTO v_failed_item_id;
    
    RETURN v_failed_item_id;
END;
$$;

-- Create views for monitoring
CREATE OR REPLACE VIEW public.active_sync_jobs AS
SELECT 
    sj.id,
    sj.sync_type,
    sj.status,
    sj.started_at,
    sj.triggered_by,
    sj.triggered_by_user_id,
    sp.phase,
    sp.progress,
    sp.message,
    sp.last_update as progress_updated_at,
    EXTRACT(EPOCH FROM (now() - sj.started_at)) as duration_seconds
FROM sync_jobs sj
LEFT JOIN sync_progress sp ON sj.id = sp.sync_id
WHERE sj.status IN ('pending', 'running')
ORDER BY sj.started_at DESC;

CREATE OR REPLACE VIEW public.sync_job_history AS
SELECT 
    sj.id,
    sj.sync_type,
    sj.status,
    sj.started_at,
    sj.completed_at,
    sj.triggered_by,
    sj.triggered_by_user_id,
    sj.results,
    sj.error_details,
    EXTRACT(EPOCH FROM (sj.completed_at - sj.started_at)) as duration_seconds,
    CASE 
        WHEN sj.status = 'completed' THEN 'success'
        WHEN sj.status = 'failed' THEN 'error'
        ELSE sj.status
    END as outcome
FROM sync_jobs sj
WHERE sj.status IN ('completed', 'failed', 'cancelled')
ORDER BY sj.started_at DESC;

CREATE OR REPLACE VIEW public.sync_failure_summary AS
SELECT 
    item_type,
    COUNT(*) as failure_count,
    COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved_count,
    MAX(created_at) as last_failure,
    AVG(retry_count) as avg_retry_count
FROM sync_failed_items
GROUP BY item_type
ORDER BY failure_count DESC;

-- Enable RLS
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_failed_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view sync data
CREATE POLICY "Admins can view sync jobs" ON sync_jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.email = auth.jwt() ->> 'email' 
            AND agents.role = 'admin' 
            AND agents.approval_status = 'approved'
        )
    );

CREATE POLICY "Admins can insert sync jobs" ON sync_jobs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.email = auth.jwt() ->> 'email' 
            AND agents.role = 'admin' 
            AND agents.approval_status = 'approved'
        )
    );

CREATE POLICY "Admins can update sync jobs" ON sync_jobs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.email = auth.jwt() ->> 'email' 
            AND agents.role = 'admin' 
            AND agents.approval_status = 'approved'
        )
    );

CREATE POLICY "Admins can view sync progress" ON sync_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.email = auth.jwt() ->> 'email' 
            AND agents.role = 'admin' 
            AND agents.approval_status = 'approved'
        )
    );

CREATE POLICY "Admins can manage sync progress" ON sync_progress
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.email = auth.jwt() ->> 'email' 
            AND agents.role = 'admin' 
            AND agents.approval_status = 'approved'
        )
    );

CREATE POLICY "Admins can view failed items" ON sync_failed_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.email = auth.jwt() ->> 'email' 
            AND agents.role = 'admin' 
            AND agents.approval_status = 'approved'
        )
    );

CREATE POLICY "Admins can manage failed items" ON sync_failed_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.email = auth.jwt() ->> 'email' 
            AND agents.role = 'admin' 
            AND agents.approval_status = 'approved'
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON sync_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sync_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sync_failed_items TO authenticated;
GRANT EXECUTE ON FUNCTION create_sync_job TO authenticated;
GRANT EXECUTE ON FUNCTION update_sync_progress TO authenticated;
GRANT EXECUTE ON FUNCTION complete_sync_job TO authenticated;
GRANT EXECUTE ON FUNCTION add_failed_item TO authenticated;
GRANT SELECT ON active_sync_jobs TO authenticated;
GRANT SELECT ON sync_job_history TO authenticated;
GRANT SELECT ON sync_failure_summary TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_sync_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_jobs_updated_at
    BEFORE UPDATE ON sync_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_jobs_updated_at(); 