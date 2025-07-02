'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentVolumeChart from '@/components/agent/AgentVolumeChart';
import AgentMerchantTable from '@/components/agent/AgentMerchantTable';
import { format } from 'date-fns';
import { useAgentDashboard, AgentCommissionData } from '@/hooks/useAgentDashboard';

export default function AgentDashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { isLoading, agentData, error } = useAgentDashboard(selectedMonth);
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading agent data...</div>;
  }
  
  if (!agentData) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">No Agent Data Found</h2>
        <p className="text-gray-500">Please contact an administrator for assistance.</p>
      </div>
    </div>;
  }

  return (
    <div className="container mx-auto py-4 px-4 sm:px-6 sm:py-6 md:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Agent Dashboard</h1>
      
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card className="h-full">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Agent Name</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold truncate">{agentData.agentName}</div>
          </CardContent>
        </Card>
        
        <Card className="h-full">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Active Merchants</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{agentData.merchantCount}</div>
          </CardContent>
        </Card>
        
        <Card className="h-full">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">MTD Processing Volume</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">${agentData.mtdVolume.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Forecast: ${agentData.forecastedVolume.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="h-full">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">MTD Residual Earnings</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-green-600">${agentData.mtdResidual.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Forecast: ${agentData.forecastedResidual.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="merchants" className="mb-6 sm:mb-8">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger className="flex-1 sm:flex-initial" value="merchants">Merchant Breakdown</TabsTrigger>
          <TabsTrigger className="flex-1 sm:flex-initial" value="trends">Volume Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="merchants" className="mt-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl">Merchant Breakdown</CardTitle>
              <CardDescription>
                Performance details for all merchants in your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <AgentMerchantTable merchants={agentData.merchants} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl">Volume Trends</CardTitle>
              <CardDescription>
                Volume and residual trends over the last 3 months
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              <div className="h-[250px] sm:h-[300px] md:h-[400px] w-full">
                <AgentVolumeChart data={agentData.volumeTrend} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
