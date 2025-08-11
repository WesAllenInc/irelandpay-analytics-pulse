-- Admin Role System Migration
-- This migration creates a comprehensive admin management system with single admin constraint

-- Create user roles table with single admin constraint
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'viewer', 'analyst')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone DEFAULT now(),
  revoked_at timestamp with time zone,
  is_active boolean GENERATED ALWAYS AS (revoked_at IS NULL) STORED,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Ensure only one active admin exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_admin 
  ON user_roles(role) 
  WHERE role = 'admin' AND revoked_at IS NULL;

-- Admin action audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Admin session tracking for security
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  ip_address inet NOT NULL,
  user_agent text,
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(admin_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token) WHERE revoked_at IS NULL;

-- RLS Policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can view roles
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin' 
      AND ur.revoked_at IS NULL
    )
  );

-- Users can view their own role
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND revoked_at IS NULL
    )
  );

-- Only admins can view their own sessions
CREATE POLICY "Admins can view own sessions" ON admin_sessions
  FOR SELECT USING (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND revoked_at IS NULL
    )
  );

-- Function to transfer admin role atomically
CREATE OR REPLACE FUNCTION transfer_admin_role(
  current_admin_id uuid,
  new_admin_id uuid
) RETURNS void AS $$
BEGIN
  -- Verify current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = current_admin_id 
    AND role = 'admin' 
    AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Current user is not an admin';
  END IF;

  -- Revoke current admin role
  UPDATE user_roles 
  SET revoked_at = now() 
  WHERE user_id = current_admin_id 
  AND role = 'admin' 
  AND revoked_at IS NULL;

  -- Grant admin role to new user
  INSERT INTO user_roles (user_id, role, granted_by)
  VALUES (new_admin_id, 'admin', current_admin_id);

  -- Revoke all active sessions for old admin
  UPDATE admin_sessions 
  SET revoked_at = now() 
  WHERE admin_id = current_admin_id 
  AND revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = is_admin.user_id 
    AND role = 'admin' 
    AND revoked_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current admin user
CREATE OR REPLACE FUNCTION get_current_admin()
RETURNS TABLE (
  user_id uuid,
  email text,
  role text,
  granted_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.user_id,
    u.email,
    ur.role,
    ur.granted_at
  FROM user_roles ur
  JOIN auth.users u ON ur.user_id = u.id
  WHERE ur.role = 'admin' 
  AND ur.revoked_at IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO admin_audit_log (
    admin_id, 
    action, 
    resource_type, 
    resource_id, 
    details, 
    ip_address, 
    user_agent
  ) VALUES (
    p_admin_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin session
CREATE OR REPLACE FUNCTION create_admin_session(
  p_admin_id uuid,
  p_session_token text,
  p_ip_address inet,
  p_user_agent text DEFAULT NULL,
  p_session_duration_hours integer DEFAULT 24
) RETURNS uuid AS $$
DECLARE
  session_id uuid;
BEGIN
  -- Verify user is admin
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'User is not an admin';
  END IF;

  INSERT INTO admin_sessions (
    admin_id,
    session_token,
    ip_address,
    user_agent,
    expires_at
  ) VALUES (
    p_admin_id,
    p_session_token,
    p_ip_address,
    p_user_agent,
    now() + (p_session_duration_hours || ' hours')::interval
  ) RETURNING id INTO session_id;

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate admin session
CREATE OR REPLACE FUNCTION validate_admin_session(p_session_token text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_sessions 
    WHERE session_token = p_session_token 
    AND revoked_at IS NULL 
    AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(p_session_token text)
RETURNS void AS $$
BEGIN
  UPDATE admin_sessions 
  SET last_activity = now() 
  WHERE session_token = p_session_token 
  AND revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke admin session
CREATE OR REPLACE FUNCTION revoke_admin_session(p_session_token text)
RETURNS void AS $$
BEGIN
  UPDATE admin_sessions 
  SET revoked_at = now() 
  WHERE session_token = p_session_token 
  AND revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke all sessions for admin
CREATE OR REPLACE FUNCTION revoke_all_admin_sessions(p_admin_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE admin_sessions 
  SET revoked_at = now() 
  WHERE admin_id = p_admin_id 
  AND revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired sessions (should be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM admin_sessions 
  WHERE expires_at < now() 
  AND revoked_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin role if no admin exists
DO $$
BEGIN
  -- Check if any admin exists
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE role = 'admin' 
    AND revoked_at IS NULL
  ) THEN
    -- Insert admin role for the first user (you'll need to replace with actual user ID)
    -- This should be done manually after the first user signs up
    RAISE NOTICE 'No admin user found. Please manually assign admin role to the first user.';
  END IF;
END $$; 