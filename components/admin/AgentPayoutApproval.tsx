'use client';

import React, { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle, Download, FileText } from "lucide-react";
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AgentPayoutApprovalProps {
  agentId: string;
  agentName: string;
  month: string;
  totalResidual: number;
  onPayoutApproved: () => void;
}

interface PayoutStatus {
  id?: string;
  status: 'pending' | 'approved' | 'paid';
  amount: number;
  approvedAt?: string;
  paidAt?: string;
}

const AgentPayoutApproval: React.FC<AgentPayoutApprovalProps> = ({ 
  agentId, 
  agentName, 
  month, 
  totalResidual,
  onPayoutApproved
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [adjustedAmount, setAdjustedAmount] = useState(totalResidual);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  
  // Format date for display
  const formattedMonth = format(new Date(`${month}-01`), 'MMMM yyyy');
  
  // Check if payout already exists
  React.useEffect(() => {
    async function checkPayoutStatus() {
      setIsLoading(true);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      const payoutMonth = `${month}-01`;
      
      const { data, error } = await supabase
        .from('agent_payout_history')
        .select('*')
        .eq('agent_id', agentId)
        .eq('payout_month', payoutMonth)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking payout status:', error);
      }
      
      if (data) {
        setPayoutStatus({
          id: data.id,
          status: data.status,
          amount: data.amount,
          approvedAt: data.approved_at,
          paidAt: data.paid_at
        });
        setAdjustedAmount(data.amount);
      } else {
        setPayoutStatus(null);
      }
      
      setIsLoading(false);
    }
    
    checkPayoutStatus();
  }, [agentId, month, supabase]);
  
  // Handle approval
  const handleApprove = async () => {
    setIsLoading(true);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to approve payouts",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Get admin user ID
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', user.user?.email)
        .single();
      
      if (adminError || !adminData) {
        toast({
          title: "Authorization Error",
          description: "You must be an admin to approve payouts",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      const payoutMonth = `${month}-01`;
      
      // If payout already exists, update it
      if (payoutStatus?.id) {
        const { error } = await supabase
          .from('agent_payout_history')
          .update({
            amount: adjustedAmount,
            status: 'approved',
            approved_by: adminData.id,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', payoutStatus.id);
        
        if (error) {
          throw new Error(`Failed to update payout: ${error.message}`);
        }
      } else {
        // Create new payout record
        const { error } = await supabase
          .from('agent_payout_history')
          .insert({
            agent_id: agentId,
            payout_month: payoutMonth,
            amount: adjustedAmount,
            status: 'approved',
            approved_by: adminData.id,
            approved_at: new Date().toISOString()
          });
        
        if (error) {
          throw new Error(`Failed to create payout: ${error.message}`);
        }
      }
      
      // Create notification for the agent
      await supabase
        .from('notifications')
        .insert({
          user_id: agentId,
          title: `Commission Approved for ${formattedMonth}`,
          message: `Your commission of $${adjustedAmount.toLocaleString()} for ${formattedMonth} has been approved.${notes ? ` Note: ${notes}` : ''}`,
          type: 'success'
        });
      
      toast({
        title: "Payout Approved",
        description: `Successfully approved payout for ${agentName} for ${formattedMonth}`,
      });
      
      // Update local state
      setPayoutStatus({
        status: 'approved',
        amount: adjustedAmount,
        approvedAt: new Date().toISOString()
      });
      
      // Call the callback
      onPayoutApproved();
      
      // Close dialog
      setConfirmDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve payout",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };
  
  // Handle marking as paid
  const handleMarkAsPaid = async () => {
    setIsLoading(true);
    
    try {
      if (!payoutStatus?.id) {
        throw new Error("No approved payout found");
      }
      
      const { error } = await supabase
        .from('agent_payout_history')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payoutStatus.id);
      
      if (error) {
        throw new Error(`Failed to mark payout as paid: ${error.message}`);
      }
      
      // Create notification for the agent
      await supabase
        .from('notifications')
        .insert({
          user_id: agentId,
          title: `Commission Paid for ${formattedMonth}`,
          message: `Your commission of $${payoutStatus.amount.toLocaleString()} for ${formattedMonth} has been paid.`,
          type: 'info'
        });
      
      toast({
        title: "Payout Marked as Paid",
        description: `Successfully marked payout for ${agentName} as paid`,
      });
      
      // Update local state
      setPayoutStatus({
        ...payoutStatus,
        status: 'paid',
        paidAt: new Date().toISOString()
      });
      
      // Close dialog
      setPayoutDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark payout as paid",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };
  
  // Generate payout report
  const generatePayoutReport = () => {
    // Headers for CSV
    const headers = [
      'Agent Name',
      'Month',
      'Amount',
      'Status',
      'Approved Date',
      'Paid Date',
      'Notes'
    ];
    
    // Format data row
    const dataRow = [
      agentName,
      formattedMonth,
      payoutStatus?.amount.toFixed(2) || adjustedAmount.toFixed(2),
      payoutStatus?.status || 'pending',
      payoutStatus?.approvedAt ? format(new Date(payoutStatus.approvedAt), 'yyyy-MM-dd') : '',
      payoutStatus?.paidAt ? format(new Date(payoutStatus.paidAt), 'yyyy-MM-dd') : '',
      notes
    ];
    
    // Combine headers and data
    const csvContent = [
      headers.join(','),
      dataRow.join(',')
    ].join('\n');
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payout-${agentName.replace(/\s+/g, '-')}-${month}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Render status badge
  const renderStatusBadge = () => {
    if (!payoutStatus) return null;
    
    switch (payoutStatus.status) {
      case 'approved':
        return (
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved
          </div>
        );
      case 'paid':
        return (
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Paid
          </div>
        );
      default:
        return (
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Pending
          </div>
        );
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Payout Approval</CardTitle>
            <CardDescription>
              Manage commission payout for {agentName} for {formattedMonth}
            </CardDescription>
          </div>
          {renderStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {payoutStatus?.status === 'paid' ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Payment Completed</AlertTitle>
            <AlertDescription>
              This commission has been paid on {payoutStatus.paidAt ? format(new Date(payoutStatus.paidAt), 'MMMM d, yyyy') : 'N/A'}.
              Amount: ${payoutStatus.amount.toLocaleString()}
            </AlertDescription>
          </Alert>
        ) : payoutStatus?.status === 'approved' ? (
          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle>Approved</AlertTitle>
            <AlertDescription>
              This commission was approved on {payoutStatus.approvedAt ? format(new Date(payoutStatus.approvedAt), 'MMMM d, yyyy') : 'N/A'}.
              Amount: ${payoutStatus.amount.toLocaleString()}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="amount">Commission Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={adjustedAmount}
                onChange={(e) => setAdjustedAmount(parseFloat(e.target.value))}
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                Original calculated amount: ${totalResidual.toLocaleString()}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this payout"
              />
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={generatePayoutReport}
          className="flex items-center gap-1"
        >
          <FileText className="h-4 w-4" />
          Export Report
        </Button>
        
        <div className="space-x-2">
          {payoutStatus?.status === 'approved' && (
            <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default">Mark as Paid</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Payment</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to mark this commission as paid? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p><strong>Agent:</strong> {agentName}</p>
                  <p><strong>Month:</strong> {formattedMonth}</p>
                  <p><strong>Amount:</strong> ${payoutStatus.amount.toLocaleString()}</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleMarkAsPaid} disabled={isLoading}>
                    {isLoading ? "Processing..." : "Confirm Payment"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          {!payoutStatus?.status && (
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default">Approve Payout</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Approval</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to approve this commission payout?
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p><strong>Agent:</strong> {agentName}</p>
                  <p><strong>Month:</strong> {formattedMonth}</p>
                  <p><strong>Amount:</strong> ${adjustedAmount.toLocaleString()}</p>
                  {notes && <p><strong>Notes:</strong> {notes}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleApprove} disabled={isLoading}>
                    {isLoading ? "Processing..." : "Approve"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default AgentPayoutApproval;
