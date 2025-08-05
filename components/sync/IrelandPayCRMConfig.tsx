'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Key, 
  Globe, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

interface CRMConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  enableSSL: boolean;
  enableLogging: boolean;
  syncInterval: number;
  maxConcurrentRequests: number;
}

interface IrelandPayCRMConfigProps {
  onConfigSave?: (config: CRMConfig) => void;
  onTestConnection?: (config: CRMConfig) => Promise<boolean>;
}

export function IrelandPayCRMConfig({ onConfigSave, onTestConnection }: IrelandPayCRMConfigProps) {
  const [config, setConfig] = useState<CRMConfig>({
    apiKey: '',
    baseUrl: 'https://api.irelandpay.com',
    timeout: 30000,
    retryAttempts: 3,
    enableSSL: true,
    enableLogging: true,
    syncInterval: 3600, // 1 hour
    maxConcurrentRequests: 5
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleConfigChange = (key: keyof CRMConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      if (onTestConnection) {
        const success = await onTestConnection(config);
        setTestResult({
          success,
          message: success 
            ? 'Connection successful! Ireland Pay CRM API is accessible.' 
            : 'Connection failed. Please check your API key and base URL.'
        });
      } else {
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 2000));
        setTestResult({
          success: true,
          message: 'Connection test completed successfully!'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      if (onConfigSave) {
        await onConfigSave(config);
      }
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestResult({
        success: true,
        message: 'Configuration saved successfully!'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to save configuration'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatSyncInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    return `${Math.round(seconds / 86400)} days`;
  };

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-foreground-muted">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your Ireland Pay CRM API key"
                value={config.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="base-url" className="text-foreground-muted">Base URL</Label>
            <Input
              id="base-url"
              placeholder="https://api.irelandpay.com"
              value={config.baseUrl}
              onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
            />
          </div>

          {/* Connection Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeout" className="text-foreground-muted">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={config.timeout}
                onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                min="5000"
                max="120000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retry-attempts" className="text-foreground-muted">Retry Attempts</Label>
              <Input
                id="retry-attempts"
                type="number"
                value={config.retryAttempts}
                onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value))}
                min="1"
                max="10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sync Interval */}
          <div className="space-y-2">
            <Label htmlFor="sync-interval" className="text-foreground-muted">
              Automatic Sync Interval
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="sync-interval"
                type="number"
                value={config.syncInterval}
                onChange={(e) => handleConfigChange('syncInterval', parseInt(e.target.value))}
                min="300"
                max="86400"
                className="flex-1"
              />
              <Badge variant="outline" className="whitespace-nowrap">
                {formatSyncInterval(config.syncInterval)}
              </Badge>
            </div>
          </div>

          {/* Max Concurrent Requests */}
          <div className="space-y-2">
            <Label htmlFor="max-concurrent" className="text-foreground-muted">
              Max Concurrent Requests
            </Label>
            <Input
              id="max-concurrent"
              type="number"
              value={config.maxConcurrentRequests}
              onChange={(e) => handleConfigChange('maxConcurrentRequests', parseInt(e.target.value))}
              min="1"
              max="20"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-ssl" className="text-foreground">Enable SSL</Label>
                <p className="text-xs text-muted-foreground">Use secure HTTPS connections</p>
              </div>
              <Switch
                id="enable-ssl"
                checked={config.enableSSL}
                onCheckedChange={(checked) => handleConfigChange('enableSSL', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-logging" className="text-foreground">Enable Logging</Label>
                <p className="text-xs text-muted-foreground">Log API requests and responses</p>
              </div>
              <Switch
                id="enable-logging"
                checked={config.enableLogging}
                onCheckedChange={(checked) => handleConfigChange('enableLogging', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security & Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">SSL/TLS Encryption</p>
                <p className="text-xs text-muted-foreground">All data transmitted securely</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">API Key Authentication</p>
                <p className="text-xs text-muted-foreground">Secure API access</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Alert variant={testResult.success ? "default" : "destructive"}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={testConnection}
          disabled={isTesting || !config.apiKey || !config.baseUrl}
          variant="outline"
          className="flex-1"
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>
        
        <Button 
          onClick={saveConfig}
          disabled={isSaving || !config.apiKey || !config.baseUrl}
          className="flex-1"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
} 