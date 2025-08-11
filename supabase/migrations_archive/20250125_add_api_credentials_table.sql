-- Create API credentials table for secure storage of API keys
CREATE TABLE IF NOT EXISTS api_credentials (
    id TEXT PRIMARY KEY,
    service_name TEXT NOT NULL,
    base_url TEXT,
    api_key TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for service lookups
CREATE INDEX IF NOT EXISTS api_credentials_service_idx ON api_credentials (service_name);
CREATE INDEX IF NOT EXISTS api_credentials_active_idx ON api_credentials (is_active);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_api_credentials_updated_at
    BEFORE UPDATE ON api_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_api_credentials_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON api_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION update_api_credentials_updated_at TO authenticated;

-- Create RPC functions for managing API credentials
CREATE OR REPLACE FUNCTION get_api_credentials(p_service_name TEXT)
RETURNS TABLE (
    id TEXT,
    service_name TEXT,
    base_url TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        id,
        service_name,
        base_url,
        is_active,
        created_at,
        updated_at
    FROM api_credentials 
    WHERE service_name = p_service_name AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION update_api_credentials(
    p_id TEXT,
    p_service_name TEXT,
    p_base_url TEXT,
    p_api_key TEXT
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO api_credentials (id, service_name, base_url, api_key)
    VALUES (p_id, p_service_name, p_base_url, p_api_key)
    ON CONFLICT (id) 
    DO UPDATE SET
        service_name = EXCLUDED.service_name,
        base_url = EXCLUDED.base_url,
        api_key = EXCLUDED.api_key,
        updated_at = now();
    
    RETURN FOUND;
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION get_api_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION update_api_credentials TO authenticated; 