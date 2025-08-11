-- Create tables for sync transaction management

-- Table to track sync transactions
CREATE TABLE IF NOT EXISTS sync_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL, -- 'merchants', 'residuals', 'volumes', 'all'
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'committed', 'rolled_back'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  year INTEGER,
  month INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT
);

-- Table to track sync operations within a transaction
CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES sync_transactions(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL, -- 'insert', 'update', 'delete'
  table_name VARCHAR(50) NOT NULL,
  record_id TEXT NOT NULL,
  previous_state JSONB, -- For rollback
  new_state JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'rolled_back'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, table_name, record_id)
);

-- Function to start a new sync transaction
CREATE OR REPLACE FUNCTION start_sync_transaction(
  p_sync_type VARCHAR(50),
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_in_progress_exists BOOLEAN;
BEGIN
  -- Check if there's already a transaction in progress for this sync type
  SELECT EXISTS(
    SELECT 1 FROM sync_transactions 
    WHERE sync_type = p_sync_type 
    AND status IN ('pending', 'in_progress')
  ) INTO v_in_progress_exists;

  -- If a transaction is already in progress, raise an error
  IF v_in_progress_exists THEN
    RAISE EXCEPTION 'A sync transaction of type % is already in progress', p_sync_type;
  END IF;

  -- Create a new sync transaction
  INSERT INTO sync_transactions (sync_type, status, year, month, metadata)
  VALUES (p_sync_type, 'in_progress', p_year, p_month, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- Function to record an operation within a transaction
CREATE OR REPLACE FUNCTION record_sync_operation(
  p_transaction_id UUID,
  p_operation_type VARCHAR(50),
  p_table_name VARCHAR(50),
  p_record_id TEXT,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operation_id UUID;
  v_transaction_status VARCHAR(50);
BEGIN
  -- Check transaction status
  SELECT status INTO v_transaction_status
  FROM sync_transactions
  WHERE id = p_transaction_id;

  -- Only allow operations on 'in_progress' transactions
  IF v_transaction_status != 'in_progress' THEN
    RAISE EXCEPTION 'Cannot record operation on transaction %. Current status: %', 
      p_transaction_id, v_transaction_status;
  END IF;

  -- Create or update the operation record
  INSERT INTO sync_operations 
    (transaction_id, operation_type, table_name, record_id, previous_state, new_state, status)
  VALUES 
    (p_transaction_id, p_operation_type, p_table_name, p_record_id, p_previous_state, p_new_state, 'completed')
  ON CONFLICT (transaction_id, table_name, record_id)
  DO UPDATE SET
    operation_type = p_operation_type,
    previous_state = COALESCE(sync_operations.previous_state, p_previous_state),
    new_state = p_new_state,
    status = 'completed',
    created_at = now()
  RETURNING id INTO v_operation_id;

  RETURN v_operation_id;
END;
$$;

-- Function to commit a sync transaction
CREATE OR REPLACE FUNCTION commit_sync_transaction(
  p_transaction_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the transaction to committed
  UPDATE sync_transactions
  SET 
    status = 'committed',
    completed_at = now(),
    metadata = sync_transactions.metadata || p_metadata
  WHERE id = p_transaction_id AND status = 'in_progress';
  
  -- Check if the transaction was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found or not in progress', p_transaction_id;
    RETURN FALSE;
  END IF;

  -- Update the refresh timestamp of our materialized views
  PERFORM refresh_performance_views();
  PERFORM update_materialized_view_refresh_time('agent_performance_metrics');
  PERFORM update_materialized_view_refresh_time('merchant_performance_by_agent');
  
  RETURN TRUE;
END;
$$;

-- Function to rollback a sync transaction
CREATE OR REPLACE FUNCTION rollback_sync_transaction(
  p_transaction_id UUID,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operation RECORD;
BEGIN
  -- Update the transaction to rolled_back
  UPDATE sync_transactions
  SET 
    status = 'rolled_back',
    completed_at = now(),
    error_message = p_error_message
  WHERE id = p_transaction_id AND status = 'in_progress';

  -- Check if the transaction was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found or not in progress', p_transaction_id;
    RETURN FALSE;
  END IF;
  
  -- Process operations in reverse order (last operation first)
  FOR v_operation IN 
    SELECT * FROM sync_operations 
    WHERE transaction_id = p_transaction_id 
    ORDER BY created_at DESC
  LOOP
    -- Rollback based on operation type
    IF v_operation.operation_type = 'insert' THEN
      -- For inserts, delete the record
      EXECUTE format('DELETE FROM %I WHERE id = %L', v_operation.table_name, v_operation.record_id);
    ELSIF v_operation.operation_type = 'update' AND v_operation.previous_state IS NOT NULL THEN
      -- For updates, restore previous state
      EXECUTE format('UPDATE %I SET row = %L::jsonb WHERE id = %L', 
                    v_operation.table_name, v_operation.previous_state, v_operation.record_id);
    END IF;
    
    -- Mark operation as rolled back
    UPDATE sync_operations
    SET status = 'rolled_back'
    WHERE id = v_operation.id;
  END LOOP;
  
  RETURN TRUE;
END;
$$;

-- Function to get transaction status
CREATE OR REPLACE FUNCTION get_sync_transaction_status(
  p_transaction_id UUID
)
RETURNS TABLE (
  transaction_id UUID,
  sync_type VARCHAR(50),
  status VARCHAR(50),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  operation_count INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as transaction_id,
    t.sync_type,
    t.status,
    t.started_at,
    t.completed_at,
    COUNT(o.id)::INTEGER as operation_count,
    t.error_message
  FROM sync_transactions t
  LEFT JOIN sync_operations o ON t.id = o.transaction_id
  WHERE t.id = p_transaction_id
  GROUP BY t.id, t.sync_type, t.status, t.started_at, t.completed_at, t.error_message;
END;
$$;

-- Function to handle atomic batch inserts with transaction safety
CREATE OR REPLACE FUNCTION atomic_batch_upsert(
  p_transaction_id UUID,
  p_table_name TEXT,
  p_records JSONB,
  p_conflict_target TEXT DEFAULT 'id',
  p_conflict_action TEXT DEFAULT 'update'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record JSONB;
  v_result JSONB = '{"success": true, "inserted": 0, "updated": 0, "failed": 0, "errors": []}'::jsonb;
  v_existing_record JSONB;
  v_record_id TEXT;
  v_operation_type TEXT;
  v_sql TEXT;
  v_transaction_status TEXT;
BEGIN
  -- Check transaction status
  SELECT status INTO v_transaction_status
  FROM sync_transactions
  WHERE id = p_transaction_id;
  
  -- Only allow operations on 'in_progress' transactions
  IF v_transaction_status != 'in_progress' THEN
    RAISE EXCEPTION 'Cannot perform batch operation on transaction %. Current status: %', 
      p_transaction_id, v_transaction_status;
  END IF;

  -- Process each record in the batch
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    BEGIN
      -- Get the record ID
      v_record_id = v_record->>'id';
      IF v_record_id IS NULL THEN
        v_record_id = gen_random_uuid()::TEXT;
        v_record = jsonb_set(v_record, '{id}', to_jsonb(v_record_id));
      END IF;
      
      -- Check if record exists
      EXECUTE format('SELECT row_to_json(%I.*)::jsonb FROM %I WHERE %I = %L', 
                    p_table_name, p_table_name, p_conflict_target, v_record_id)
      INTO v_existing_record;
      
      -- Determine operation type
      IF v_existing_record IS NULL THEN
        v_operation_type := 'insert';
        v_sql := format('INSERT INTO %I SELECT * FROM jsonb_populate_record(null::%I, %L) RETURNING true', 
                       p_table_name, p_table_name, v_record);
        v_result := jsonb_set(v_result, '{inserted}', to_jsonb((v_result->>'inserted')::int + 1));
      ELSE
        v_operation_type := 'update';
        
        -- For conflict action "update"
        IF p_conflict_action = 'update' THEN
          v_sql := format('UPDATE %I SET row = %L::jsonb WHERE %I = %L RETURNING true', 
                         p_table_name, v_record, p_conflict_target, v_record_id);
        -- For conflict action "ignore"
        ELSIF p_conflict_action = 'ignore' THEN
          v_sql := 'SELECT true';
        ELSE
          RAISE EXCEPTION 'Unsupported conflict action: %', p_conflict_action;
        END IF;
        
        v_result := jsonb_set(v_result, '{updated}', to_jsonb((v_result->>'updated')::int + 1));
      END IF;
      
      -- Execute the operation
      EXECUTE v_sql;
      
      -- Record the operation for potential rollback
      PERFORM record_sync_operation(
        p_transaction_id,
        v_operation_type,
        p_table_name,
        v_record_id,
        v_existing_record,
        v_record
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Record the failure
      v_result := jsonb_set(v_result, '{failed}', to_jsonb((v_result->>'failed')::int + 1));
      v_result := jsonb_set(v_result, '{errors}', 
                          v_result->'errors' || to_jsonb(format('Error with record %s: %s', v_record_id, SQLERRM)));
    END;
  END LOOP;
  
  RETURN v_result;
END;
$$;
