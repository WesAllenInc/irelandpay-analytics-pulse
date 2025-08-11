-- Incremental Sync Logic for IRIS CRM Integration
-- This migration adds functionality to track data changes and support incremental sync

-- 1. Create a table to store last sync timestamps for each data type
CREATE TABLE IF NOT EXISTS public.sync_watermarks (
    id SERIAL PRIMARY KEY,
    data_type TEXT NOT NULL, -- e.g., 'merchants', 'residuals', 'agents'
    last_sync_timestamp TIMESTAMPTZ NOT NULL,
    sync_scope TEXT, -- Optional field for partitioning data (e.g., by month, region, etc.)
    record_count INTEGER, -- Number of records processed in the last sync
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (data_type, sync_scope) -- Enforce unique constraint on data_type + sync_scope
);

-- 2. Add columns to track change metadata in core tables
-- Merchants table
ALTER TABLE IF EXISTS public.merchants 
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hash_value TEXT; -- Store hash of record to detect changes

-- Residuals table
ALTER TABLE IF EXISTS public.residuals 
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hash_value TEXT;

-- Agents table
ALTER TABLE IF EXISTS public.agents
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hash_value TEXT;

-- 3. Create a table to store change logs
CREATE TABLE IF NOT EXISTS public.change_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL, -- Store primary key or unique identifier of the changed record
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[], -- Array of field names that changed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS change_log_table_name_idx ON public.change_log (table_name);
CREATE INDEX IF NOT EXISTS change_log_record_id_idx ON public.change_log (record_id);
CREATE INDEX IF NOT EXISTS change_log_created_at_idx ON public.change_log (created_at);

-- 4. Create a function to generate hash values for records
CREATE OR REPLACE FUNCTION public.generate_record_hash(record_data JSONB)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    canonicalized JSONB;
BEGIN
    -- Remove timestamp fields that shouldn't affect the hash
    canonicalized = record_data - 'created_at' - 'updated_at' - 'last_sync_at' - 'last_modified_at' - 'hash_value';
    
    -- Sort the JSON to ensure consistent hashing regardless of field order
    RETURN encode(sha256(canonicalized::text::bytea), 'hex');
END;
$$;

-- 5. Create a function to update hash values in tables
CREATE OR REPLACE FUNCTION public.update_record_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Generate hash value from the new record data
    NEW.hash_value = public.generate_record_hash(to_jsonb(NEW));
    NEW.last_modified_at = now();
    
    RETURN NEW;
END;
$$;

-- 6. Create a function to log changes to monitored tables
CREATE OR REPLACE FUNCTION public.log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    changed_field_list TEXT[];
    old_record_hash TEXT;
    new_record_hash TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- For inserts, log the new data
        SELECT array_agg(key)::TEXT[] INTO changed_field_list FROM jsonb_object_keys(to_jsonb(NEW)) key;
        INSERT INTO public.change_log (
            table_name, 
            record_id, 
            operation, 
            old_data, 
            new_data, 
            changed_fields
        ) VALUES (
            TG_TABLE_NAME::TEXT,
            NEW.id::TEXT,
            'INSERT',
            NULL,
            to_jsonb(NEW),
            changed_field_list
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Compute old and new hashes
        old_record_hash = public.generate_record_hash(to_jsonb(OLD));
        new_record_hash = public.generate_record_hash(to_jsonb(NEW));
        
        -- Only log if the hash values differ (actual data change)
        IF old_record_hash <> new_record_hash THEN
            -- Calculate which fields changed
            SELECT array_agg(key)::TEXT[] 
            INTO changed_field_list 
            FROM (
                SELECT key 
                FROM jsonb_object_keys(to_jsonb(NEW)) key 
                WHERE to_jsonb(NEW) -> key <> to_jsonb(OLD) -> key
                  AND key NOT IN ('updated_at', 'last_modified_at', 'hash_value')
            ) changed_fields;
            
            INSERT INTO public.change_log (
                table_name, 
                record_id, 
                operation, 
                old_data, 
                new_data, 
                changed_fields
            ) VALUES (
                TG_TABLE_NAME::TEXT,
                NEW.id::TEXT,
                'UPDATE',
                to_jsonb(OLD),
                to_jsonb(NEW),
                changed_field_list
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- For deletes, log the old data
        SELECT array_agg(key)::TEXT[] INTO changed_field_list FROM jsonb_object_keys(to_jsonb(OLD)) key;
        INSERT INTO public.change_log (
            table_name, 
            record_id, 
            operation, 
            old_data, 
            new_data, 
            changed_fields
        ) VALUES (
            TG_TABLE_NAME::TEXT,
            OLD.id::TEXT,
            'DELETE',
            to_jsonb(OLD),
            NULL,
            changed_field_list
        );
        RETURN OLD;
    END IF;
END;
$$;

-- 7. Create triggers to maintain hashes and log changes

-- Merchants table triggers
DROP TRIGGER IF EXISTS merchants_hash_trigger ON public.merchants;
CREATE TRIGGER merchants_hash_trigger
BEFORE INSERT OR UPDATE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.update_record_hash();

DROP TRIGGER IF EXISTS merchants_change_log_trigger ON public.merchants;
CREATE TRIGGER merchants_change_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.log_table_changes();

-- Residuals table triggers
DROP TRIGGER IF EXISTS residuals_hash_trigger ON public.residuals;
CREATE TRIGGER residuals_hash_trigger
BEFORE INSERT OR UPDATE ON public.residuals
FOR EACH ROW
EXECUTE FUNCTION public.update_record_hash();

DROP TRIGGER IF EXISTS residuals_change_log_trigger ON public.residuals;
CREATE TRIGGER residuals_change_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.residuals
FOR EACH ROW
EXECUTE FUNCTION public.log_table_changes();

-- Agents table triggers
DROP TRIGGER IF EXISTS agents_hash_trigger ON public.agents;
CREATE TRIGGER agents_hash_trigger
BEFORE INSERT OR UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_record_hash();

DROP TRIGGER IF EXISTS agents_change_log_trigger ON public.agents;
CREATE TRIGGER agents_change_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.log_table_changes();

-- 8. Create RPC functions for incremental sync operations

-- Function to get last sync watermark
CREATE OR REPLACE FUNCTION public.get_sync_watermark(p_data_type TEXT, p_sync_scope TEXT DEFAULT NULL)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_timestamp TIMESTAMPTZ;
BEGIN
    SELECT last_sync_timestamp INTO v_timestamp
    FROM public.sync_watermarks
    WHERE data_type = p_data_type
      AND (sync_scope = p_sync_scope OR (sync_scope IS NULL AND p_sync_scope IS NULL))
    ORDER BY last_sync_timestamp DESC
    LIMIT 1;
    
    -- If no watermark exists, return a timestamp from long ago
    RETURN COALESCE(v_timestamp, '2000-01-01'::TIMESTAMPTZ);
END;
$$;

-- Function to update sync watermark
CREATE OR REPLACE FUNCTION public.update_sync_watermark(
    p_data_type TEXT, 
    p_timestamp TIMESTAMPTZ DEFAULT NULL,
    p_sync_scope TEXT DEFAULT NULL,
    p_record_count INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Default to current timestamp if not provided
    p_timestamp := COALESCE(p_timestamp, now());
    
    -- Insert or update the watermark
    INSERT INTO public.sync_watermarks (
        data_type, 
        last_sync_timestamp, 
        sync_scope, 
        record_count
    ) VALUES (
        p_data_type,
        p_timestamp,
        p_sync_scope,
        p_record_count
    )
    ON CONFLICT (data_type, sync_scope)
    DO UPDATE SET 
        last_sync_timestamp = p_timestamp,
        record_count = p_record_count,
        updated_at = now();
END;
$$;

-- Function to get changed records since last sync
CREATE OR REPLACE FUNCTION public.get_changes_since(
    p_table_name TEXT, 
    p_since_timestamp TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    record_id TEXT,
    operation TEXT,
    changed_at TIMESTAMPTZ,
    data JSONB,
    changes TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If no timestamp provided, get the last sync watermark
    IF p_since_timestamp IS NULL THEN
        p_since_timestamp := public.get_sync_watermark(p_table_name);
    END IF;

    RETURN QUERY
    SELECT 
        cl.record_id,
        cl.operation,
        cl.created_at as changed_at,
        COALESCE(cl.new_data, cl.old_data) as data,
        cl.changed_fields as changes
    FROM 
        public.change_log cl
    WHERE 
        cl.table_name = p_table_name
        AND cl.created_at > p_since_timestamp
    ORDER BY 
        cl.created_at ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function to get a count of changes since last sync
CREATE OR REPLACE FUNCTION public.get_changes_count(
    p_table_name TEXT, 
    p_since_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- If no timestamp provided, get the last sync watermark
    IF p_since_timestamp IS NULL THEN
        p_since_timestamp := public.get_sync_watermark(p_table_name);
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.change_log
    WHERE table_name = p_table_name
      AND created_at > p_since_timestamp;
    
    RETURN v_count;
END;
$$;

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.sync_watermarks TO authenticated;
GRANT SELECT ON public.change_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sync_watermark TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sync_watermark TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_changes_since TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_changes_count TO authenticated;

-- Initialize hash values for existing records
-- This may take some time on large tables, consider running as a separate migration if needed
DO $$
BEGIN
    -- Update merchants hash values
    UPDATE public.merchants
    SET 
        hash_value = public.generate_record_hash(to_jsonb(merchants)),
        last_modified_at = COALESCE(updated_at, now());
    
    -- Update residuals hash values
    UPDATE public.residuals
    SET 
        hash_value = public.generate_record_hash(to_jsonb(residuals)),
        last_modified_at = COALESCE(updated_at, now());
    
    -- Update agents hash values
    UPDATE public.agents
    SET 
        hash_value = public.generate_record_hash(to_jsonb(agents)),
        last_modified_at = COALESCE(updated_at, now());
END;
$$;
