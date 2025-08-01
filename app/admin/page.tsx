import { AdminOnly } from '@/hooks/useAdminCheck';
import { AdminBadge } from '@/hooks/useAdminCheck';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Clock, Users, Activity, ShieldCheck } from 'lucide-react';
import { SyncManagementPanel } from '@/components/admin/SyncManagementPanel';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { UserManagement } from '@/components/admin/UserManagement';

// Admin stat card component
function AdminStatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  variant = 'default' 
}: {
  title: string;
  value: string;
  description: string;
  icon: any;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) {
  const variantStyles = {
    default: 'bg-card',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200'
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  return (
    <AdminOnly>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage system settings, monitor sync operations, and oversee user access
            </p>
          </div>
          <AdminBadge />
        </div>

        {/* Overview Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            title="Active Syncs"
            value="2"
            description="Daily syncs at 11 AM & 7 PM"
            icon={RefreshCw}
          />
          <AdminStatCard
            title="Data Freshness"
            value="2 hours"
            description="Last successful sync"
            icon={Clock}
            variant="success"
          />
          <AdminStatCard
            title="Total Merchants"
            value="1,234"
            description="+56 this week"
            icon={Users}
          />
          <AdminStatCard
            title="System Health"
            value="98.5%"
            description="Uptime last 30 days"
            icon={Activity}
            variant="success"
          />
        </div>

        {/* Admin Functions Tabs */}
        <Tabs defaultValue="sync" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync Management
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Admin Settings
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-4">
            <SyncManagementPanel />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AdminAuditLog />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <AdminSettings />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </AdminOnly>
  );
} 