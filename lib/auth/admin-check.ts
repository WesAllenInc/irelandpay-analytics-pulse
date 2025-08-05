import { createSupabaseServerClient } from '@/lib/supabase'

export interface AdminUser {
  id: string
  email: string
  agent_name: string
  role: 'admin' | 'agent' | 'analyst'
  approval_status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('agents')
    .select('role, approval_status')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    return false
  }
  
  return data.role === 'admin' && data.approval_status === 'approved'
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('role', 'admin')
    .eq('approval_status', 'approved')
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data as AdminUser
}

export async function getAdminEmail(): Promise<string | null> {
  const adminUser = await getAdminUser()
  return adminUser?.email || null
}

export async function isFirstRun(): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  
  // Check if any admin users exist
  const { data: adminUsers, error } = await supabase
    .from('agents')
    .select('id')
    .eq('role', 'admin')
    .eq('approval_status', 'approved')
    .limit(1)
  
  if (error) {
    console.error('Error checking first run status:', error)
    return false
  }
  
  return !adminUsers || adminUsers.length === 0
} 