-- Create sync_logs table for storing sync operation logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message text NOT NULL,
  details jsonb,
  sync_id uuid,
  timestamp timestamp with time zone DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_timestamp ON sync_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_id ON sync_logs(sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_level ON sync_logs(level);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);

-- Enable RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view logs
CREATE POLICY "Users can view sync logs" ON sync_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to insert logs
CREATE POLICY "Service can insert sync logs" ON sync_logs
  FOR INSERT WITH CHECK (true);

-- Allow service role to delete old logs
CREATE POLICY "Service can delete old sync logs" ON sync_logs
  FOR DELETE USING (true);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON sync_logs TO authenticated;
GRANT SELECT, INSERT, DELETE ON sync_logs TO service_role;
