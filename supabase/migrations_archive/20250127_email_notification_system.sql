-- Email notification system migration
-- This migration adds tables for email notifications, preferences, and logging

-- Email notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_success boolean DEFAULT true,
  sync_failure boolean DEFAULT true,
  daily_summary boolean DEFAULT true,
  weekly_report boolean DEFAULT false,
  error_threshold integer DEFAULT 1,
  data_age_threshold integer DEFAULT 24, -- hours
  admin_email text NOT NULL,
  cc_emails text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Email log table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  to_email text NOT NULL,
  cc_emails text[],
  subject text NOT NULL,
  category text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer DEFAULT 0,
  last_error text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Email queue table for reliability
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  category text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  last_error text,
  scheduled_for timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Sync logs table (if not exists)
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id text UNIQUE NOT NULL,
  sync_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  merchants_count integer DEFAULT 0,
  transactions_count integer DEFAULT 0,
  residuals_count integer DEFAULT 0,
  duration_ms integer DEFAULT 0,
  errors text[] DEFAULT '{}',
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_category ON email_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_pending ON email_queue(scheduled_for) 
  WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type, created_at DESC);

-- Function to process email queue
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void AS $$
BEGIN
  -- This would be called by a cron job or worker
  -- Process emails where scheduled_for <= now() and sent_at IS NULL
  -- Implementation would be added in a separate function
END;
$$ LANGUAGE plpgsql;

-- Function to update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
  p_user_id uuid,
  p_sync_success boolean DEFAULT true,
  p_sync_failure boolean DEFAULT true,
  p_daily_summary boolean DEFAULT true,
  p_weekly_report boolean DEFAULT false,
  p_error_threshold integer DEFAULT 1,
  p_data_age_threshold integer DEFAULT 24,
  p_admin_email text,
  p_cc_emails text[] DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO notification_preferences (
    user_id, sync_success, sync_failure, daily_summary, weekly_report,
    error_threshold, data_age_threshold, admin_email, cc_emails, updated_at
  ) VALUES (
    p_user_id, p_sync_success, p_sync_failure, p_daily_summary, p_weekly_report,
    p_error_threshold, p_data_age_threshold, p_admin_email, p_cc_emails, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    sync_success = EXCLUDED.sync_success,
    sync_failure = EXCLUDED.sync_failure,
    daily_summary = EXCLUDED.daily_summary,
    weekly_report = EXCLUDED.weekly_report,
    error_threshold = EXCLUDED.error_threshold,
    data_age_threshold = EXCLUDED.data_age_threshold,
    admin_email = EXCLUDED.admin_email,
    cc_emails = EXCLUDED.cc_emails,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to get notification preferences
CREATE OR REPLACE FUNCTION get_notification_preferences(p_user_id uuid)
RETURNS TABLE (
  sync_success boolean,
  sync_failure boolean,
  daily_summary boolean,
  weekly_report boolean,
  error_threshold integer,
  data_age_threshold integer,
  admin_email text,
  cc_emails text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    np.sync_success,
    np.sync_failure,
    np.daily_summary,
    np.weekly_report,
    np.error_threshold,
    np.data_age_threshold,
    np.admin_email,
    np.cc_emails
  FROM notification_preferences np
  WHERE np.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log email send
CREATE OR REPLACE FUNCTION log_email_send(
  p_message_id text,
  p_to_email text,
  p_cc_emails text[],
  p_subject text,
  p_category text,
  p_status text
)
RETURNS void AS $$
BEGIN
  INSERT INTO email_logs (
    message_id, to_email, cc_emails, subject, category, status, sent_at
  ) VALUES (
    p_message_id, p_to_email, p_cc_emails, p_subject, p_category, p_status, now()
  );
END;
$$ LANGUAGE plpgsql;

-- Function to log email failure
CREATE OR REPLACE FUNCTION log_email_failure(
  p_to_email text,
  p_subject text,
  p_category text,
  p_attempts integer,
  p_last_error text
)
RETURNS void AS $$
BEGIN
  INSERT INTO email_logs (
    to_email, subject, category, status, attempts, last_error
  ) VALUES (
    p_to_email, p_subject, p_category, 'failed', p_attempts, p_last_error
  );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for email_logs (admin only)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs" ON email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for email_queue (admin only)
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email queue" ON email_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for sync_logs (admin only)
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs" ON sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert sync logs" ON sync_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update sync logs" ON sync_logs
  FOR UPDATE USING (true);

-- Insert default notification preferences for existing admin users
INSERT INTO notification_preferences (user_id, admin_email)
SELECT 
  ur.user_id,
  u.email
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM notification_preferences np 
    WHERE np.user_id = ur.user_id
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON email_logs TO authenticated;
GRANT ALL ON email_queue TO authenticated;
GRANT ALL ON sync_logs TO authenticated; 