"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import useAuth from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

type User = {
  id: string;
  email: string;
  agent_name: string;
  role: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }

    fetchUsers();
  }, [authLoading, isAdmin, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ approval_status: status })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, approval_status: status } : user
      ));

      // Show success message
      toast({
        title: 'Success',
        description: `User ${status === 'approved' ? 'approved' : 'rejected'} successfully.`,
      });

      // Mark related notifications as actioned
      await supabase
        .from('admin_notifications')
        .update({ status: 'actioned' })
        .eq('type', 'user_approval')
        .ilike('content', `%${users.find(u => u.id === userId)?.email || ''}%`);

    } catch (error: any) {
      console.error(`Error ${status} user:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${status} user. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts and approval requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium">Users</h3>
            <Button onClick={fetchUsers} variant="outline" size="sm">
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.agent_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{getStatusBadge(user.approval_status)}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user.approval_status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => updateUserStatus(user.id, 'approved')}
                              variant="outline"
                              size="sm"
                              className="bg-green-100 hover:bg-green-200 text-green-800"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => updateUserStatus(user.id, 'rejected')}
                              variant="outline"
                              size="sm"
                              className="bg-red-100 hover:bg-red-200 text-red-800"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {user.approval_status === 'rejected' && (
                          <Button
                            onClick={() => updateUserStatus(user.id, 'approved')}
                            variant="outline"
                            size="sm"
                          >
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
