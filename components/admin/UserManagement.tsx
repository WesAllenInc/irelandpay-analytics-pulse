'use client';

import { useState, useEffect } from 'react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { adminServiceClient } from '@/lib/auth/admin-service-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Shield, 
  AlertTriangle,
  Crown,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface UserWithRoles {
  user_id: string;
  email: string;
  roles: Array<{
    role: string;
    granted_at: string;
    revoked_at: string | null;
    is_active: boolean;
  }>;
}

export function UserManagement() {
  const { adminData } = useAdminCheck();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'viewer' | 'analyst'>('viewer');
  const [showRoleTransfer, setShowRoleTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [transferConfirmation, setTransferConfirmation] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminServiceClient.getAllUsersWithRoles();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const grantRole = async () => {
    if (!selectedUser || !adminData) return;

    try {
              await adminServiceClient.grantRole(adminData.user_id, selectedUser, selectedRole);
      toast.success(`Role ${selectedRole} granted successfully`);
      fetchUsers();
      setSelectedUser('');
      setSelectedRole('viewer');
    } catch (error) {
      toast.error('Failed to grant role');
      console.error('Error granting role:', error);
    }
  };

  const revokeRole = async (userId: string, role: string) => {
    if (!adminData) return;

    try {
              await adminServiceClient.revokeRole(adminData.user_id, userId, role as any);
      toast.success(`Role ${role} revoked successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to revoke role');
      console.error('Error revoking role:', error);
    }
  };

  const handleTransferAdminRole = async () => {
    if (!selectedUser || !adminData || transferConfirmation !== 'TRANSFER ADMIN ROLE') return;

    setTransferring(true);
    
    try {
      // This is a critical action - require re-authentication
      const { error: authError } = await fetch('/api/auth/reauthenticate', {
        method: 'POST'
      });
      
      if (authError) {
        toast.error('Please re-authenticate to continue');
        return;
      }

      // Perform transfer
              await adminServiceClient.transferAdminRole(adminData.user_id, selectedUser);
      toast.success('Admin role transferred successfully');
      
      // Log out current admin
      await fetch('/api/auth/signout', { method: 'POST' });
      
      // Redirect to login
      window.location.href = '/auth/login';
    } catch (error) {
      toast.error('Failed to transfer admin role');
      console.error('Transfer error:', error);
    } finally {
      setTransferring(false);
    }
  };

  const getRoleBadge = (role: string, isActive: boolean) => {
    const variants = {
      admin: 'destructive',
      viewer: 'secondary',
      analyst: 'default'
    } as const;

    return (
      <Badge variant={variants[role as keyof typeof variants] || 'secondary'}>
        {isActive ? (
          <>
            {role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
            {role}
          </>
        ) : (
          <>
            <EyeOff className="h-3 w-3 mr-1" />
            {role} (Revoked)
          </>
        )}
      </Badge>
    );
  };

  const getActiveRoles = (user: UserWithRoles) => {
    return user.roles.filter(role => role.is_active);
  };

  const hasActiveRole = (user: UserWithRoles, roleType: string) => {
    return user.roles.some(role => role.role === roleType && role.is_active);
  };

  return (
    <div className="space-y-6">
      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowRoleTransfer(true)}
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Crown className="mr-2 h-4 w-4" />
              Transfer Admin Role
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-pulse text-muted-foreground">Loading users...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Active Roles</TableHead>
                  <TableHead>Last Role Grant</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.user_id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getActiveRoles(user).map((role, index) => (
                          <div key={index}>
                            {getRoleBadge(role.role, role.is_active)}
                          </div>
                        ))}
                        {getActiveRoles(user).length === 0 && (
                          <span className="text-sm text-muted-foreground">No active roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.roles.length > 0 ? (
                        <div className="text-sm">
                          {format(new Date(user.roles[0].granted_at), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {hasActiveRole(user, 'admin') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeRole(user.user_id, 'admin')}
                            className="text-destructive"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                        {!hasActiveRole(user, 'viewer') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user.user_id);
                              setSelectedRole('viewer');
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grant Role */}
      <Card>
        <CardHeader>
          <CardTitle>Grant Role</CardTitle>
          <CardDescription>
            Grant a new role to a user
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={grantRole} disabled={!selectedUser}>
                <UserPlus className="mr-2 h-4 w-4" />
                Grant Role
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Role Transfer Dialog */}
      <Dialog open={showRoleTransfer} onOpenChange={setShowRoleTransfer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Transfer Admin Role
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Transferring admin role will:
                <ul className="list-disc ml-6 mt-2">
                  <li>Revoke your admin access immediately</li>
                  <li>Grant full admin privileges to the selected user</li>
                  <li>Log you out of all sessions</li>
                  <li>This action cannot be reversed</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select New Admin</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(user => !hasActiveRole(user, 'admin')).map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && !confirming && (
              <Button
                variant="destructive"
                onClick={() => setConfirming(true)}
                className="w-full"
              >
                Continue with Transfer
              </Button>
            )}

            {confirming && (
              <div className="space-y-4 p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium">
                  Type "TRANSFER ADMIN ROLE" to confirm:
                </p>
                <Input
                  placeholder="TRANSFER ADMIN ROLE"
                  value={transferConfirmation}
                  onChange={(e) => setTransferConfirmation(e.target.value)}
                />
                <Button
                  variant="destructive"
                  onClick={handleTransferAdminRole}
                  disabled={transferring || transferConfirmation !== 'TRANSFER ADMIN ROLE'}
                  className="w-full"
                >
                  {transferring ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    'Confirm Transfer'
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 