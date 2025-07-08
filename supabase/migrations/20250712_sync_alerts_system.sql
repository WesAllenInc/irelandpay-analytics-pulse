-- Sync Alerts System
-- This migration adds tables and functions to track and manage sync alerts

-- 1. Create a table to store sync alerts
CREATE TABLE IF NOT EXISTS public.sync_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type TEXT NOT NULL, -- 'sync_failure', 'rate_limit', 'data_validation', etc.
    severity TEXT NOT NULL, -- 'info', 'warning', 'error', 'critical'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX sync_alerts_alert_type_idx ON public.sync_alerts (alert_type);
CREATE INDEX sync_alerts_status_idx ON public.sync_alerts (status);
CREATE INDEX sync_alerts_created_at_idx ON public.sync_alerts (created_at);

-- 2. Create a table to store alert subscriptions
CREATE TABLE IF NOT EXISTS public.alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    alert_types TEXT[] NOT NULL DEFAULT '{sync_failure, rate_limit, data_validation}', -- Alert types to subscribe to
    min_severity TEXT NOT NULL DEFAULT 'warning', -- Minimum severity level to receive alerts: 'info', 'warning', 'error', 'critical'
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE UNIQUE INDEX alert_subscriptions_user_id_idx ON public.alert_subscriptions (user_id);

-- 3. Create a function to generate an alert
CREATE OR REPLACE FUNCTION public.create_alert(
    p_alert_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_message TEXT,
    p_details JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    -- Validate severity
    IF p_severity NOT IN ('info', 'warning', 'error', 'critical') THEN
        RAISE EXCEPTION 'Invalid severity: %', p_severity;
    END IF;

    -- Insert the alert
    INSERT INTO public.sync_alerts (
        alert_type,
        severity,
        title,
        message,
        details
    ) VALUES (
        p_alert_type,
        p_severity,
        p_title,
        p_message,
        p_details
    )
    RETURNING id INTO v_alert_id;
    
    -- Notify subscribers (in a real implementation, this would call an Edge Function or similar)
    -- For now, we'll just return the ID and handle notifications in the application
    
    RETURN v_alert_id;
END;
$$;

-- 4. Create a function to acknowledge an alert
CREATE OR REPLACE FUNCTION public.acknowledge_alert(
    p_alert_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_affected_rows INTEGER;
BEGIN
    UPDATE public.sync_alerts
    SET 
        status = 'acknowledged',
        acknowledged_by = p_user_id,
        acknowledged_at = now(),
        updated_at = now()
    WHERE 
        id = p_alert_id 
        AND status = 'active'
    RETURNING 1 INTO v_affected_rows;
    
    RETURN v_affected_rows = 1;
END;
$$;

-- 5. Create a function to resolve an alert
CREATE OR REPLACE FUNCTION public.resolve_alert(
    p_alert_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_affected_rows INTEGER;
BEGIN
    UPDATE public.sync_alerts
    SET 
        status = 'resolved',
        resolved_at = now(),
        updated_at = now()
    WHERE 
        id = p_alert_id 
        AND status IN ('active', 'acknowledged')
    RETURNING 1 INTO v_affected_rows;
    
    RETURN v_affected_rows = 1;
END;
$$;

-- 6. Create a function to get active alerts
CREATE OR REPLACE FUNCTION public.get_active_alerts(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_min_severity TEXT DEFAULT 'info', -- Minimum severity level: 'info', 'warning', 'error', 'critical'
    p_alert_types TEXT[] DEFAULT NULL -- Specific alert types to filter by
) RETURNS SETOF public.sync_alerts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.sync_alerts
    WHERE 
        status = 'active'
        AND (
            CASE 
                WHEN p_min_severity = 'info' THEN severity IN ('info', 'warning', 'error', 'critical')
                WHEN p_min_severity = 'warning' THEN severity IN ('warning', 'error', 'critical')
                WHEN p_min_severity = 'error' THEN severity IN ('error', 'critical')
                WHEN p_min_severity = 'critical' THEN severity = 'critical'
                ELSE FALSE
            END
        )
        AND (p_alert_types IS NULL OR alert_type = ANY(p_alert_types))
    ORDER BY 
        CASE 
            WHEN severity = 'critical' THEN 1
            WHEN severity = 'error' THEN 2
            WHEN severity = 'warning' THEN 3
            WHEN severity = 'info' THEN 4
            ELSE 5
        END,
        created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 7. Create a trigger to generate alerts for sync failures
CREATE OR REPLACE FUNCTION public.sync_failure_alert_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only trigger for changes to 'status' field or new records
    IF TG_OP = 'INSERT' OR NEW.status <> OLD.status THEN
        -- If a sync job fails
        IF NEW.status = 'failed' THEN
            PERFORM public.create_alert(
                'sync_failure',
                'error',
                'Sync Failure Detected',
                'A sync operation has failed. Check the error details for more information.',
                jsonb_build_object(
                    'sync_id', NEW.id,
                    'sync_type', NEW.sync_type,
                    'error', NEW.error,
                    'started_at', NEW.started_at,
                    'completed_at', NEW.completed_at
                )
            );
        END IF;
        
        -- If a sync job has been retried too many times
        IF NEW.status = 'retrying' AND NEW.retry_count >= 3 THEN
            PERFORM public.create_alert(
                'sync_retry_limit',
                'warning',
                'Multiple Sync Retries',
                'A sync job has been retried ' || NEW.retry_count || ' times.',
                jsonb_build_object(
                    'sync_id', NEW.id,
                    'sync_type', NEW.sync_type,
                    'retry_count', NEW.retry_count,
                    'last_error', NEW.error
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on sync_status table
CREATE TRIGGER sync_status_alert_trigger
AFTER INSERT OR UPDATE ON public.sync_status
FOR EACH ROW
EXECUTE FUNCTION public.sync_failure_alert_trigger();

-- Create trigger on sync_queue table
CREATE TRIGGER sync_queue_alert_trigger
AFTER UPDATE ON public.sync_queue
FOR EACH ROW
EXECUTE FUNCTION public.sync_failure_alert_trigger();

-- 8. Create a function to generate API rate limit alerts
CREATE OR REPLACE FUNCTION public.monitor_api_rate_limits()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit_record RECORD;
BEGIN
    -- Look for rate limits that are close to exhaustion (less than 10% remaining)
    FOR v_limit_record IN
        SELECT *
        FROM public.api_rate_limits
        WHERE 
            created_at >= (now() - interval '1 hour')
            AND limit > 0
            AND (remaining::float / limit::float) <= 0.1
    LOOP
        -- Generate an alert
        PERFORM public.create_alert(
            'rate_limit',
            CASE
                WHEN (v_limit_record.remaining::float / v_limit_record.limit::float) <= 0.05 THEN 'error'
                ELSE 'warning'
            END,
            'API Rate Limit Warning',
            'API rate limit for ' || v_limit_record.service || ' ' || v_limit_record.endpoint || ' is approaching exhaustion.',
            jsonb_build_object(
                'service', v_limit_record.service,
                'endpoint', v_limit_record.endpoint,
                'limit', v_limit_record.limit,
                'remaining', v_limit_record.remaining,
                'percentage_remaining', (v_limit_record.remaining::float / v_limit_record.limit::float) * 100,
                'reset_at', v_limit_record.reset_at
            )
        );
    END LOOP;
END;
$$;

-- 9. Create a function to set up a user's alert subscription
CREATE OR REPLACE FUNCTION public.set_alert_subscription(
    p_user_id UUID,
    p_alert_types TEXT[] DEFAULT '{sync_failure, rate_limit, data_validation}',
    p_min_severity TEXT DEFAULT 'warning',
    p_email_notifications BOOLEAN DEFAULT TRUE,
    p_in_app_notifications BOOLEAN DEFAULT TRUE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription_id UUID;
BEGIN
    -- Validate severity
    IF p_min_severity NOT IN ('info', 'warning', 'error', 'critical') THEN
        RAISE EXCEPTION 'Invalid severity: %', p_min_severity;
    END IF;

    -- Insert or update the subscription
    INSERT INTO public.alert_subscriptions (
        user_id,
        alert_types,
        min_severity,
        email_notifications,
        in_app_notifications
    ) VALUES (
        p_user_id,
        p_alert_types,
        p_min_severity,
        p_email_notifications,
        p_in_app_notifications
    )
    ON CONFLICT (user_id) DO UPDATE SET
        alert_types = p_alert_types,
        min_severity = p_min_severity,
        email_notifications = p_email_notifications,
        in_app_notifications = p_in_app_notifications,
        updated_at = now()
    RETURNING id INTO v_subscription_id;
    
    RETURN v_subscription_id;
END;
$$;

-- Set up RLS policies
ALTER TABLE public.sync_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read alerts
CREATE POLICY sync_alerts_select_policy ON public.sync_alerts
    FOR SELECT TO authenticated
    USING (true);

-- Only allow service role to insert alerts
CREATE POLICY sync_alerts_insert_policy ON public.sync_alerts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IN (
        SELECT id FROM auth.users WHERE is_admin = true
    ));

-- Only allow the alert's acknowledger or admins to update alerts
CREATE POLICY sync_alerts_update_policy ON public.sync_alerts
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = acknowledged_by OR
        auth.uid() IN (SELECT id FROM auth.users WHERE is_admin = true)
    );

-- Users can manage their own subscriptions
CREATE POLICY alert_subscriptions_select_policy ON public.alert_subscriptions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY alert_subscriptions_insert_policy ON public.alert_subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY alert_subscriptions_update_policy ON public.alert_subscriptions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Grant appropriate permissions
GRANT SELECT ON public.sync_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.alert_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_alert_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_alert TO authenticated;

-- Only service role can create alerts or resolve them
GRANT EXECUTE ON FUNCTION public.create_alert TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_alert TO service_role;
GRANT EXECUTE ON FUNCTION public.monitor_api_rate_limits TO service_role;
