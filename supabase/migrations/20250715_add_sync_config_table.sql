-- Create sync configuration table for storing API sync settings
CREATE TABLE IF NOT EXISTS public.sync_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default configuration
INSERT INTO public.sync_config (id, config) 
VALUES (
    'default',
    '{
        "autoSyncEnabled": true,
        "defaultFrequency": "daily",
        "defaultTime": "06:00",
        "retryAttempts": 3,
        "retryDelay": 30,
        "timeoutSeconds": 300,
        "maxConcurrentSyncs": 2,
        "enableNotifications": true,
        "enableErrorAlerts": true
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_sync_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_sync_config_updated_at
    BEFORE UPDATE ON public.sync_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sync_config_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sync_config_updated_at TO authenticated;

-- Create RPC functions for managing sync config
CREATE OR REPLACE FUNCTION public.get_sync_config()
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT config FROM public.sync_config WHERE id = 'default';
$$;

CREATE OR REPLACE FUNCTION public.update_sync_config(p_config JSONB)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.sync_config
    SET config = p_config, updated_at = now()
    WHERE id = 'default';
    
    RETURN FOUND;
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.get_sync_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sync_config TO authenticated; 