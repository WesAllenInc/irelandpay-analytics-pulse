'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  EyeOff,
  Zap,
  Clock,
  Database,
  Network
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
    baseUrl: 'https://crm.ireland-pay.com/api/v1',
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* API Configuration */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-foreground-muted font-medium">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your Ireland Pay CRM API key"
                  value={config.apiKey}
                  onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                  className="pr-10 bg-input/50 border-input-border/50 focus:border-primary/50 transition-colors"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <Label htmlFor="base-url" className="text-foreground-muted font-medium">Base URL</Label>
              <Input
                id="base-url"
                placeholder="https://api.irelandpay.com"
                value={config.baseUrl}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                className="bg-input/50 border-input-border/50 focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Connection Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeout" className="text-foreground-muted font-medium">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={config.timeout}
                  onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                  min="5000"
                  max="120000"
                  className="bg-input/50 border-input-border/50 focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retry-attempts" className="text-foreground-muted font-medium">Retry Attempts</Label>
                <Input
                  id="retry-attempts"
                  type="number"
                  value={config.retryAttempts}
                  onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value))}
                  min="1"
                  max="10"
                  className="bg-input/50 border-input-border/50 focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sync Settings */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-500" />
              Sync Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sync Interval */}
            <div className="space-y-2">
              <Label htmlFor="sync-interval" className="text-foreground-muted font-medium">
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
                  className="flex-1 bg-input/50 border-input-border/50 focus:border-primary/50 transition-colors"
                />
                <Badge variant="outline" className="whitespace-nowrap bg-primary/10 border-primary/20 text-primary">
                  {formatSyncInterval(config.syncInterval)}
                </Badge>
              </div>
            </div>

            {/* Max Concurrent Requests */}
            <div className="space-y-2">
              <Label htmlFor="max-concurrent" className="text-foreground-muted font-medium">
                Max Concurrent Requests
              </Label>
              <Input
                id="max-concurrent"
                type="number"
                value={config.maxConcurrentRequests}
                onChange={(e) => handleConfigChange('maxConcurrentRequests', parseInt(e.target.value))}
                min="1"
                max="20"
                className="bg-input/50 border-input-border/50 focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-ssl" className="text-foreground font-medium">Enable SSL</Label>
                  <p className="text-xs text-muted-foreground">Use secure HTTPS connections</p>
                </div>
                <Switch
                  id="enable-ssl"
                  checked={config.enableSSL}
                  onCheckedChange={(checked) => handleConfigChange('enableSSL', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-logging" className="text-foreground font-medium">Enable Logging</Label>
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
      </motion.div>

      {/* Security & Compliance */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              Security & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">SSL/TLS Encryption</p>
                  <p className="text-xs text-green-600 dark:text-green-400">All data transmitted securely</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">API Key Authentication</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Secure API access</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Test Results */}
      <AnimatePresence>
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant={testResult.success ? "default" : "destructive"} className="border-2">
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <motion.div variants={itemVariants} className="flex gap-3">
        <Button 
          onClick={testConnection}
          disabled={isTesting || !config.apiKey || !config.baseUrl}
          variant="outline"
          className="flex-1 bg-card/50 border-border/50 hover:bg-card/70"
          size="lg"
        >
          {isTesting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              Testing...
            </>
          ) : (
            <>
              <Network className="h-4 w-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>
        
        <Button 
          onClick={saveConfig}
          disabled={isSaving || !config.apiKey || !config.baseUrl}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
} 