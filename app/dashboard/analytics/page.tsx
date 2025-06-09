"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface MerchantMetrics {
  month: string;
  total_txns: number;
  total_volume: number;
  mid: string;
}

interface ResidualData {
  payout_month: string;
  income: number;
  expenses: number;
  net_profit: number;
  mid: string;
}

interface ChartData {
  name: string;
  volume?: number;
  transactions?: number;
  income?: number;
  expenses?: number;
  profit?: number;
}

export default function AnalyticsDashboard() {
  const [merchantMetrics, setMerchantMetrics] = useState<MerchantMetrics[]>([]);
  const [residualData, setResidualData] = useState<ResidualData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(startOfMonth(new Date()), 6),
    to: endOfMonth(new Date())
  });

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
      const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

      if (fromDate && toDate) {
        // Fetch merchant metrics
        const { data: metricsData, error: metricsError } = await supabaseClient
          .from('merchant_metrics')
          .select('month, total_txns, total_volume, mid')
          .gte('month', fromDate)
          .lte('month', toDate)
          .order('month');

        if (metricsError) {
          console.error('Error fetching merchant metrics:', metricsError);
        } else {
          setMerchantMetrics(metricsData || []);
        }

        // Fetch residual data
        const { data: residualsData, error: residualsError } = await supabaseClient
          .from('residual_payouts')
          .select('payout_month, income, expenses, net_profit, mid')
          .gte('payout_month', fromDate)
          .lte('payout_month', toDate)
          .order('payout_month');

        if (residualsError) {
          console.error('Error fetching residual data:', residualsError);
        } else {
          setResidualData(residualsData || []);
        }
      }
      
      setIsLoading(false);
    }

    fetchData();
  }, [dateRange]);

  // Prepare data for charts
  const prepareTransactionData = (): ChartData[] => {
    const monthMap = new Map<string, ChartData>();
    
    merchantMetrics.forEach(metric => {
      const month = metric.month.substring(0, 7); // Get YYYY-MM format
      const displayMonth = format(new Date(month), 'MMM yyyy');
      
      if (!monthMap.has(month)) {
        monthMap.set(month, { name: displayMonth, volume: 0, transactions: 0 });
      }
      
      const data = monthMap.get(month)!;
      data.volume = (data.volume || 0) + metric.total_volume;
      data.transactions = (data.transactions || 0) + metric.total_txns;
    });
    
    return Array.from(monthMap.values());
  };

  const prepareResidualData = (): ChartData[] => {
    const monthMap = new Map<string, ChartData>();
    
    residualData.forEach(residual => {
      const month = residual.payout_month.substring(0, 7); // Get YYYY-MM format
      const displayMonth = format(new Date(month), 'MMM yyyy');
      
      if (!monthMap.has(month)) {
        monthMap.set(month, { name: displayMonth, income: 0, expenses: 0, profit: 0 });
      }
      
      const data = monthMap.get(month)!;
      data.income = (data.income || 0) + residual.income;
      data.expenses = (data.expenses || 0) + residual.expenses;
      data.profit = (data.profit || 0) + residual.net_profit;
    });
    
    return Array.from(monthMap.values());
  };

  const transactionData = prepareTransactionData();
  const residualData_chart = prepareResidualData();

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <DatePickerWithRange 
          className="w-[300px]"
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transaction Metrics</TabsTrigger>
          <TabsTrigger value="residuals">Residual Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Volume</CardTitle>
                <CardDescription>Monthly transaction volume trend</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">Loading data...</p>
                  </div>
                ) : transactionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={transactionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="volume" name="Volume ($)" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No transaction data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Transaction Count</CardTitle>
                <CardDescription>Monthly transaction count trend</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">Loading data...</p>
                  </div>
                ) : transactionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={transactionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="transactions" name="Transactions" fill="#84cc16" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No transaction data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="residuals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Expenses</CardTitle>
                <CardDescription>Monthly income and expense trend</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">Loading data...</p>
                  </div>
                ) : residualData_chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={residualData_chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="income" name="Income ($)" fill="#4f46e5" />
                      <Bar dataKey="expenses" name="Expenses ($)" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No residual data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Net Profit</CardTitle>
                <CardDescription>Monthly net profit trend</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">Loading data...</p>
                  </div>
                ) : residualData_chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={residualData_chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="profit" name="Net Profit ($)" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No residual data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}