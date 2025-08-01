'use client';

import { useState, useEffect } from 'react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { adminServiceClient, AdminSession } from '@/lib/auth/admin-service-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShieldCheck, 
  Monitor, 
  LogOut, 
  AlertTriangle,
  Clock,
  Globe,
  Smartphone,
  Laptop,
  Database,
  Archive,
  Settings
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ArchiveStatsDashboard } from './ArchiveStatsDashboard';

export function AdminSettings() {
  const { adminData } = useAdminCheck();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (adminData) {
      fetchActiveSessions();
    }
  }, [adminData]);

  const fetchActiveSessions = async () => {
    if (!adminData) return;
    
    setLoading(true);
    try {
      const data = await adminServiceClient.getActiveSessions(adminData.user_id);
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch active sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
              await adminServiceClient.revokeAdminSession(sessionId);
      toast.success('Session revoked successfully');
      fetchActiveSessions();
    } catch (error) {
      toast.error('Failed to revoke session');
      console.error('Error revoking session:', error);
    }
  };

  const revokeAllOtherSessions = async () => {
    if (!adminData) return;
    
    try {
      // Revoke all sessions except current one
      const currentSessionToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('admin_session='))
        ?.split('=')[1];

      for (const session of sessions) {
        if (session.session_token !== currentSessionToken) {
          await adminServiceClient.revokeAdminSession(session.session_token);
        }
      }
      
      toast.success('All other sessions revoked');
      fetchActiveSessions();
    } catch (error) {
      toast.error('Failed to revoke sessions');
      console.error('Error revoking sessions:', error);
    }
  };

  const getCurrentDevice = (userAgent: string | null) => {
    if (!userAgent) return 'unknown';
    
    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    return 'desktop';
  };

  const parseUserAgent = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown Device';
    
    // Simple user agent parsing
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    
    return 'Unknown Browser';
  };

  const getDeviceIcon = (userAgent: string | null) => {
    const device = getCurrentDevice(userAgent);
    switch (device) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Laptop className="h-4 w-4" />;
    }
  };

  const isCurrentSession = (session: AdminSession) => {
    const currentSessionToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('admin_session='))
      ?.split('=')[1];
    
    return session.session_token === currentSessionToken;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Data Archive
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          {/* Admin Session Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Active Admin Sessions</CardTitle>
                  <CardDescription>
                    Manage your active admin sessions across devices
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={revokeAllOtherSessions}
                  disabled={sessions.length <= 1}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Revoke All Others
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-pulse text-muted-foreground">Loading sessions...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(session.user_agent)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {parseUserAgent(session.user_agent)}
                                </span>
                                {isCurrentSession(session) && (
                                  <Badge variant="success" className="text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getCurrentDevice(session.user_agent)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {session.ip_address}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <div className="text-sm">
                                {format(new Date(session.last_activity), 'MMM d, h:mm a')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(session.expires_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeSession(session.id)}
                            disabled={isCurrentSession(session)}
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {sessions.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No active sessions found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archive" className="space-y-6">
          <ArchiveStatsDashboard />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Security Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Security Information
              </CardTitle>
              <CardDescription>
                Important security details about your admin account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Session Security</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Sessions expire after 24 hours</li>
                    <li>• Sessions are tied to IP addresses</li>
                    <li>• All actions are logged and audited</li>
                    <li>• You can revoke sessions remotely</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Admin Privileges</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Full system access and control</li>
                    <li>• Sync operation management</li>
                    <li>• User role management</li>
                    <li>• Audit log access</li>
                    <li>• Data archive management</li>
                  </ul>
                </div>
              </div>

              <Separator />

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Security Best Practices</AlertTitle>
                <AlertDescription>
                  Always log out from shared devices, regularly review your active sessions, 
                  and report any suspicious activity immediately.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 