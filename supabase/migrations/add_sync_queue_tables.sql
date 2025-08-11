-- Create sync queue table for managing sync operations with retry capability
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'retrying', 'completed', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry TIMESTAMPTZ,
  last_error TEXT,
  last_failure TIMESTAMPTZ,
  result JSONB
);

-- Add indexes to improve queue query performance
CREATE INDEX IF NOT EXISTS sync_queue_status_idx ON public.sync_queue(status);
CREATE INDEX IF NOT EXISTS sync_queue_priority_created_idx ON public.sync_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS sync_queue_next_retry_idx ON public.sync_queue(next_retry) 
  WHERE status = 'retrying';

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION public.get_sync_queue_stats()
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'pending', (SELECT COUNT(*) FROM public.sync_queue WHERE status = 'pending'),
    'running', (SELECT COUNT(*) FROM public.sync_queue WHERE status = 'running'),
    'retrying', (SELECT COUNT(*) FROM public.sync_queue WHERE status = 'retrying'),
    'completed', (SELECT COUNT(*) FROM public.sync_queue WHERE status = 'completed'),
    'failed', (SELECT COUNT(*) FROM public.sync_queue WHERE status = 'failed'),
    'cancelled', (SELECT COUNT(*) FROM public.sync_queue WHERE status = 'cancelled'),
    'total', (SELECT COUNT(*) FROM public.sync_queue),
    'oldest_pending', (
      SELECT created_at 
      FROM public.sync_queue 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 1
    ),
    'next_retry', (
      SELECT next_retry 
      FROM public.sync_queue 
      WHERE status = 'retrying' AND next_retry IS NOT NULL
      ORDER BY next_retry ASC 
      LIMIT 1
    )
  );
$$;

-- RPC to enqueue a new sync job
CREATE OR REPLACE FUNCTION public.enqueue_sync_job(
  p_job_type TEXT,
  p_parameters JSONB,
  p_priority INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO public.sync_queue (job_type, parameters, status, priority)
  VALUES (p_job_type, p_parameters, 'pending', p_priority)
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$;

-- RPC to cancel a pending or retrying job
CREATE OR REPLACE FUNCTION public.cancel_sync_job(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  v_rows_affected INT;
BEGIN
  UPDATE public.sync_queue
  SET 
    status = 'cancelled',
    completed_at = NOW()
  WHERE 
    id = p_job_id 
    AND status IN ('pending', 'retrying')
  RETURNING 1 INTO v_rows_affected;
  
  RETURN v_rows_affected > 0;
END;
$$;

-- RPC to get next job to process
CREATE OR REPLACE FUNCTION public.get_next_sync_job()
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(
      to_jsonb(job),
      '{}'::jsonb
    ) 
  FROM (
    SELECT *
    FROM public.sync_queue
    WHERE 
      status = 'pending'
      OR (
        status = 'retrying' 
        AND next_retry <= NOW()
      )
    ORDER BY 
      priority DESC, 
      created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  ) job;
$$;

-- Create view to track sync operations and their status
CREATE OR REPLACE VIEW public.sync_queue_status AS
SELECT
  sq.id,
  sq.job_type,
  sq.status,
  sq.created_at,
  sq.started_at,
  sq.completed_at,
  sq.retry_count,
  sq.next_retry,
  sq.parameters,
  EXTRACT(EPOCH FROM (COALESCE(sq.completed_at, NOW()) - sq.created_at)) AS duration_seconds,
  CASE 
    WHEN sq.status = 'completed' THEN
      CASE 
        WHEN sq.result->>'success' = 'true' THEN true
        ELSE false
      END
    ELSE NULL
  END AS success,
  sq.last_error
FROM
  public.sync_queue sq
ORDER BY
  sq.created_at DESC;

-- Add RLS policy for sync queue
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read but not modify
CREATE POLICY "Authenticated users can read sync queue"
  ON public.sync_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow service role to insert/update/delete
CREATE POLICY "Service role can manage sync queue"
  ON public.sync_queue
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.sync_queue TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sync_queue_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_sync_job TO authenticated;
