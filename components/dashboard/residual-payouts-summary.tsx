'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface ResidualPayout {
  id: number;
  mid: string;
  merchant_dba: string;
  payout_month: string;
  transactions: number;
  sales_amount: number;
  income: number;
  expenses: number;
  net_profit: number;
  agent_net: number;
  source_file: string;
}

export default function ResidualPayoutsSummary() {
  const [payouts, setPayouts] = useState<ResidualPayout[]>([]);
  const [totalNetProfit, setTotalNetProfit] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('current');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    async function fetchAvailableMonths() {
      const { data, error } = await supabase
        .from('residual_payouts')
        .select('payout_month')
        .order('payout_month', { ascending: false });
        
      if (error) {
        console.error('Error fetching available months:', error);
        return;
      }
      
      const uniqueMonths = Array.from(new Set(data?.map(item => item.payout_month.substring(0, 7))));
      setAvailableMonths(uniqueMonths);
    }
    
    fetchAvailableMonths();
  }, [supabase]);
  
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      let query = supabase.from('residual_payouts').select('*');
      
      if (selectedMonth === 'current') {
        // Get the current month in YYYY-MM format
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Filter for the current month
        query = query.ilike('payout_month', `${currentMonth}%`);
      } else if (selectedMonth !== 'all') {
        // Filter for the selected month
        query = query.ilike('payout_month', `${selectedMonth}%`);
      }
      
      const { data, error } = await query
        .order('net_profit', { ascending: false })
        .limit(10);
        
      if (error) {
        console.error('Error fetching residual payouts:', error);
        setIsLoading(false);
        return;
      }
      
      setPayouts(data || []);
      
      // Calculate total net profit for the selected month
      const { data: sumData, error: sumError } = await supabase
        .from('residual_payouts')
        .select('net_profit')
        .ilike('payout_month', selectedMonth === 'current' 
          ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}%` 
          : selectedMonth === 'all' ? '%' : `${selectedMonth}%`);
          
      if (sumError) {
        console.error('Error calculating total net profit:', sumError);
      } else {
        const total = sumData?.reduce((sum, item) => sum + (Number(item.net_profit) || 0), 0) || 0;
        setTotalNetProfit(total);
      }
      
      setIsLoading(false);
    }
    
    fetchData();
  }, [supabase, selectedMonth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Residual Payouts Summary</CardTitle>
          <CardDescription>Summary of merchant residual payouts</CardDescription>
        </div>
        <Select
          value={selectedMonth}
          onValueChange={setSelectedMonth}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current Month</SelectItem>
            <SelectItem value="all">All Months</SelectItem>
            {availableMonths.map(month => (
              <SelectItem key={month} value={month}>
                {format(new Date(`${month}-01`), 'MMMM yyyy')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : payouts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Payout Month</TableHead>
                <TableHead className="text-right">Net Profit</TableHead>
                <TableHead className="text-right">Agent Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-medium">{payout.merchant_dba}</TableCell>
                  <TableCell>{formatDate(payout.payout_month)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(payout.net_profit)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(payout.agent_net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No residual payout data found.
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing top {Math.min(payouts.length, 10)} merchants by net profit
        </div>
        <div className="font-medium">
          Total Net Profit: {formatCurrency(totalNetProfit)}
        </div>
      </CardFooter>
    </Card>
  );
}
