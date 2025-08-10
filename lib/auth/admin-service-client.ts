import { createSupabaseBrowserClient } from '@lib/supabase/client';

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

export class AdminServiceClient {
  private supabase = createSupabaseBrowserClient();

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
   * Get audit logs (client-safe version)
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
      .from('admin_audit_logs')
      .select(`
        *,
        admin:admin_users(email)
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

    return data || [];
  }

  /**
   * Get all users with roles (client-safe version)
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
      .rpc('get_all_users_with_roles');

    if (error) {
      console.error('Error fetching users with roles:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get active sessions for an admin (client-safe version)
   */
  async getActiveSessions(adminId: string): Promise<AdminSession[]> {
    const { data, error } = await this.supabase
      .from('admin_sessions')
      .select('*')
      .eq('admin_id', adminId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Revoke admin session (client-safe version)
   */
  async revokeAdminSession(sessionToken: string): Promise<void> {
    const { error } = await this.supabase
      .from('admin_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Error revoking session:', error);
      throw new Error('Failed to revoke session');
    }
  }

  /**
   * Log admin action (client-safe version)
   */
  async logAdminAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any
  ): Promise<void> {
    const { error } = await this.supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: adminId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        ip_address: null, // Client can't get IP address
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
      });

    if (error) {
      console.error('Error logging admin action:', error);
      throw new Error('Failed to log admin action');
    }
  }

  /**
   * Grant role (client-safe version)
   */
  async grantRole(
    adminId: string,
    userId: string,
    role: 'admin' | 'viewer' | 'analyst'
  ): Promise<void> {
    const { error } = await this.supabase
      .rpc('grant_role', {
        p_admin_id: adminId,
        p_user_id: userId,
        p_role: role
      });

    if (error) {
      console.error('Error granting role:', error);
      throw new Error('Failed to grant role');
    }
  }

  /**
   * Revoke role (client-safe version)
   */
  async revokeRole(
    adminId: string,
    userId: string,
    role: 'admin' | 'viewer' | 'analyst'
  ): Promise<void> {
    const { error } = await this.supabase
      .rpc('revoke_role', {
        p_admin_id: adminId,
        p_user_id: userId,
        p_role: role
      });

    if (error) {
      console.error('Error revoking role:', error);
      throw new Error('Failed to revoke role');
    }
  }

  /**
   * Transfer admin role (client-safe version)
   */
  async transferAdminRole(
    currentAdminId: string,
    newAdminId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .rpc('transfer_admin_role', {
        p_current_admin_id: currentAdminId,
        p_new_admin_id: newAdminId
      });

    if (error) {
      console.error('Error transferring admin role:', error);
      throw new Error('Failed to transfer admin role');
    }
  }
}

export const adminServiceClient = new AdminServiceClient(); 