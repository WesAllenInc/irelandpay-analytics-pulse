-- Add approval_status column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Update existing users to 'approved' status
UPDATE agents SET approval_status = 'approved' WHERE approval_status IS NULL;

-- Create admin_notifications table for tracking approval requests
CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'actioned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status);
