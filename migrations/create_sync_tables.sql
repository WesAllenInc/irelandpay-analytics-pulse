-- Create sync_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS "sync_status" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "status" TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  "data_type" TEXT NOT NULL,
  "started_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "results" JSONB,
  "error" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sync_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS "sync_logs" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sync_id" UUID REFERENCES sync_status(id),
  "message" TEXT NOT NULL,
  "level" TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  "details" JSONB,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_status_status ON sync_status(status);
CREATE INDEX IF NOT EXISTS idx_sync_status_data_type ON sync_status(data_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_id ON sync_logs(sync_id);
