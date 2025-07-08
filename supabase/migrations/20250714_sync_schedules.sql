-- Create a table for storing sync schedules
CREATE TABLE IF NOT EXISTS public.sync_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_type TEXT NOT NULL, -- e.g., 'merchants', 'residuals', 'agents'
    sync_scope TEXT, -- Optional field for partitioning data (e.g., month for residuals)
    frequency TEXT NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    cron_expression TEXT NOT NULL, -- Standard cron expression
    next_run TIMESTAMPTZ NOT NULL, -- When the next run should occur
    days TEXT[], -- For weekly schedules, array of days (e.g., ['mon', 'wed', 'fri'])
    time_of_day TEXT, -- For non-hourly schedules, the time (e.g., "08:30")
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS sync_schedules_data_type_idx ON public.sync_schedules (data_type);
CREATE INDEX IF NOT EXISTS sync_schedules_next_run_idx ON public.sync_schedules (next_run);
CREATE INDEX IF NOT EXISTS sync_schedules_is_active_idx ON public.sync_schedules (is_active);

-- Create a function to update the next_run time based on the cron expression
CREATE OR REPLACE FUNCTION public.calculate_next_cron_run(
    p_cron_expression TEXT, 
    p_current_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
    v_minute INTEGER;
    v_hour INTEGER;
    v_day INTEGER;
    v_month INTEGER;
    v_day_of_week INTEGER;
    v_now TIMESTAMPTZ;
    v_next TIMESTAMPTZ;
    v_cron_parts TEXT[];
BEGIN
    -- Use provided time or current time
    v_now := COALESCE(p_current_time, now());
    
    -- Parse cron expression
    v_cron_parts := string_to_array(p_cron_expression, ' ');
    
    -- Basic validation
    IF array_length(v_cron_parts, 1) < 5 THEN
        RAISE EXCEPTION 'Invalid cron expression: %', p_cron_expression;
    END IF;
    
    -- Extract cron components
    v_minute := CASE WHEN v_cron_parts[1] = '*' THEN 0 ELSE v_cron_parts[1]::INTEGER END;
    v_hour := CASE WHEN v_cron_parts[2] = '*' THEN v_now::time::HOUR ELSE v_cron_parts[2]::INTEGER END;
    v_day := CASE WHEN v_cron_parts[3] = '*' THEN EXTRACT(DAY FROM v_now) ELSE v_cron_parts[3]::INTEGER END;
    v_month := CASE WHEN v_cron_parts[4] = '*' THEN EXTRACT(MONTH FROM v_now) ELSE v_cron_parts[4]::INTEGER END;
    -- Day of week is optional in our simple implementation
    
    -- Calculate the next run time
    -- This is a simplified implementation that doesn't handle all cron features
    v_next := date_trunc('day', v_now);
    v_next := v_next + (v_hour * interval '1 hour') + (v_minute * interval '1 minute');
    
    -- If the time has passed today, add one day
    IF v_next <= v_now THEN
        CASE 
            WHEN v_cron_parts[2] = '*' THEN
                -- Hourly - add 1 hour
                v_next := v_now + interval '1 hour';
                v_next := date_trunc('hour', v_next) + (v_minute * interval '1 minute');
            WHEN v_cron_parts[3] = '*' THEN
                -- Daily - add 1 day
                v_next := v_next + interval '1 day';
            WHEN v_cron_parts[4] = '*' AND v_cron_parts[5] <> '*' THEN
                -- Weekly - find next occurrence of the weekday
                -- This is simplified and doesn't handle complex cases
                v_next := v_next + interval '1 day';
            WHEN v_cron_parts[3] <> '*' THEN
                -- Monthly - add 1 month
                v_next := v_next + interval '1 month';
            ELSE
                -- Default fallback - add 1 day
                v_next := v_next + interval '1 day';
        END CASE;
    END IF;
    
    RETURN v_next;
END;
$$;

-- Create a function to update the next_run time for all active schedules
CREATE OR REPLACE FUNCTION public.update_sync_schedule_next_runs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
    v_record RECORD;
BEGIN
    FOR v_record IN 
        SELECT id, cron_expression
        FROM public.sync_schedules
        WHERE is_active = true
    LOOP
        BEGIN
            UPDATE public.sync_schedules
            SET 
                next_run = public.calculate_next_cron_run(cron_expression),
                updated_at = now()
            WHERE id = v_record.id;
            
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue with other schedules
            RAISE NOTICE 'Error updating schedule %: %', v_record.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Create a function to get due schedules
CREATE OR REPLACE FUNCTION public.get_due_sync_schedules(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    data_type TEXT,
    sync_scope TEXT,
    cron_expression TEXT,
    frequency TEXT,
    next_run TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.data_type,
        s.sync_scope,
        s.cron_expression,
        s.frequency,
        s.next_run
    FROM 
        public.sync_schedules s
    WHERE 
        s.is_active = true
        AND s.next_run <= now()
    ORDER BY 
        s.next_run ASC
    LIMIT p_limit;
END;
$$;

-- Create a function to mark a schedule as executed
CREATE OR REPLACE FUNCTION public.mark_sync_schedule_executed(p_schedule_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.sync_schedules
    SET 
        next_run = public.calculate_next_cron_run(cron_expression),
        updated_at = now()
    WHERE id = p_schedule_id;
    
    RETURN FOUND;
END;
$$;

-- Create a view to show upcoming schedules
CREATE OR REPLACE VIEW public.upcoming_sync_schedules AS
SELECT 
    s.id,
    s.data_type,
    s.sync_scope,
    s.frequency,
    s.cron_expression,
    s.next_run,
    s.is_active
FROM 
    public.sync_schedules s
WHERE 
    s.is_active = true
ORDER BY 
    s.next_run ASC;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_next_cron_run TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sync_schedule_next_runs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_sync_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_sync_schedule_executed TO authenticated;
GRANT SELECT ON public.upcoming_sync_schedules TO authenticated;
