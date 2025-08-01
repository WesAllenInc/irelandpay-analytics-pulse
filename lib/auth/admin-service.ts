import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

export interface AdminUser {
  user_id: string;
  email: string;
  role: string;
  granted_at: string;
}

export interface AdminSession {
  id: string;
  admin_id: string;
  session_token: string;
  ip_address: string;
  user_agent: string | null;
  last_activity: string;
  expires_at: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin?: {
    email: string;
  };
}

export class AdminService {
  private supabase = createClient();

  /**
   * Check if a user is an admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('is_admin', { user_id: userId });

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Get the current admin user
   */
  async getCurrentAdmin(): Promise<AdminUser | null> {
    const { data, error } = await this.supabase
      .rpc('get_current_admin');

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0] as AdminUser;
  }

  /**
   * Create admin session with additional security
   */
  async createAdminSession(userId: string): Promise<AdminSession> {
    // Verify admin status
    const isUserAdmin = await this.isAdmin(userId);
    if (!isUserAdmin) {
      throw new Error('User is not an admin');
    }

    // Get request details
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Create secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionDurationHours = 24; // 24 hour sessions

    // Store session using database function
    const { data, error } = await this.supabase
      .rpc('create_admin_session', {
        p_admin_id: userId,
        p_session_token: sessionToken,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_session_duration_hours: sessionDurationHours
      });

    if (error) {
      console.error('Error creating admin session:', error);
      throw new Error('Failed to create admin session');
    }

    // Get the created session
    const { data: sessionData, error: sessionError } = await this.supabase
      .from('admin_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !sessionData) {
      throw new Error('Failed to retrieve created session');
    }

    // Log admin login
    await this.logAdminAction(userId, 'admin.login', 'session', sessionData.id, {
      ip_address: ipAddress,
      user_agent: userAgent
    });

    return sessionData as AdminSession;
  }

  /**
   * Validate admin session
   */
  async validateAdminSession(sessionToken: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('validate_admin_session', { p_session_token: sessionToken });

    if (error) {
      console.error('Error validating admin session:', error);
      return false;
    }

    if (data) {
      // Update last activity
      await this.supabase
        .rpc('update_session_activity', { p_session_token: sessionToken });
    }

    return !!data;
  }

  /**
   * Get admin session details
   */
  async getAdminSession(sessionToken: string): Promise<AdminSession | null> {
    const { data, error } = await this.supabase
      .from('admin_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return data as AdminSession;
  }

  /**
   * Revoke admin session
   */
  async revokeAdminSession(sessionToken: string): Promise<void> {
    const { error } = await this.supabase
      .rpc('revoke_admin_session', { p_session_token: sessionToken });

    if (error) {
      console.error('Error revoking admin session:', error);
      throw new Error('Failed to revoke session');
    }
  }

  /**
   * Get all active sessions for an admin
   */
  async getActiveSessions(adminId: string): Promise<AdminSession[]> {
    const { data, error } = await this.supabase
      .from('admin_sessions')
      .select('*')
      .eq('admin_id', adminId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('last_activity', { ascending: false });

    if (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }

    return data as AdminSession[];
  }

  /**
   * Log admin actions for audit trail
   */
  async logAdminAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any
  ): Promise<void> {
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    const { error } = await this.supabase
      .rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_details: details || {},
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

    if (error) {
      console.error('Error logging admin action:', error);
    }
  }

  /**
   * Get audit log entries
   */
  async getAuditLogs(
    limit: number = 100,
    offset: number = 0,
    filters?: {
      action?: string;
      resourceType?: string;
      adminId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<AuditLogEntry[]> {
    let query = this.supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:admin_id(email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }

    if (filters?.adminId) {
      query = query.eq('admin_id', filters.adminId);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return data as AuditLogEntry[];
  }

  /**
   * Transfer admin role to another user
   */
  async transferAdminRole(
    currentAdminId: string,
    newAdminId: string
  ): Promise<void> {
    // Verify current user is admin
    const isCurrentAdmin = await this.isAdmin(currentAdminId);
    if (!isCurrentAdmin) {
      throw new Error('Current user is not an admin');
    }

    // Start transaction
    const { error } = await this.supabase.rpc('transfer_admin_role', {
      current_admin_id: currentAdminId,
      new_admin_id: newAdminId
    });

    if (error) {
      console.error('Error transferring admin role:', error);
      throw new Error('Failed to transfer admin role');
    }

    // Log the transfer
    await this.logAdminAction(
      currentAdminId,
      'admin.role.transfer',
      'user',
      newAdminId,
      { from: currentAdminId, to: newAdminId }
    );
  }

  /**
   * Grant role to user
   */
  async grantRole(
    adminId: string,
    userId: string,
    role: 'admin' | 'viewer' | 'analyst'
  ): Promise<void> {
    // Verify admin status
    const isUserAdmin = await this.isAdmin(adminId);
    if (!isUserAdmin) {
      throw new Error('User is not an admin');
    }

    // Grant role
    const { error } = await this.supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
        granted_by: adminId
      });

    if (error) {
      console.error('Error granting role:', error);
      throw new Error('Failed to grant role');
    }

    // Log the action
    await this.logAdminAction(
      adminId,
      'admin.role.grant',
      'user',
      userId,
      { role, granted_to: userId }
    );
  }

  /**
   * Revoke role from user
   */
  async revokeRole(
    adminId: string,
    userId: string,
    role: 'admin' | 'viewer' | 'analyst'
  ): Promise<void> {
    // Verify admin status
    const isUserAdmin = await this.isAdmin(adminId);
    if (!isUserAdmin) {
      throw new Error('User is not an admin');
    }

    // Revoke role
    const { error } = await this.supabase
      .from('user_roles')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('role', role)
      .is('revoked_at', null);

    if (error) {
      console.error('Error revoking role:', error);
      throw new Error('Failed to revoke role');
    }

    // Log the action
    await this.logAdminAction(
      adminId,
      'admin.role.revoke',
      'user',
      userId,
      { role, revoked_from: userId }
    );
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<Array<{
    role: string;
    granted_at: string;
    revoked_at: string | null;
    is_active: boolean;
  }>> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role, granted_at, revoked_at, is_active')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get all users with their roles
   */
  async getAllUsersWithRoles(): Promise<Array<{
    user_id: string;
    email: string;
    roles: Array<{
      role: string;
      granted_at: string;
      revoked_at: string | null;
      is_active: boolean;
    }>;
  }>> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        granted_at,
        revoked_at,
        is_active,
        users:user_id(email)
      `)
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('Error fetching users with roles:', error);
      return [];
    }

    // Group by user
    const userMap = new Map();
    data?.forEach((row: any) => {
      if (!userMap.has(row.user_id)) {
        userMap.set(row.user_id, {
          user_id: row.user_id,
          email: row.users?.email,
          roles: []
        });
      }
      userMap.get(row.user_id).roles.push({
        role: row.role,
        granted_at: row.granted_at,
        revoked_at: row.revoked_at,
        is_active: row.is_active
      });
    });

    return Array.from(userMap.values());
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('cleanup_expired_sessions');

    if (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }

    return data || 0;
  }
}

export const adminService = new AdminService(); 