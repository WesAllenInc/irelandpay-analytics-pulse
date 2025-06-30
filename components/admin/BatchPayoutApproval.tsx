'use client';

import React, { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BatchPayoutApprovalProps {
  month: string;
  agents: Array<{
    id: string;
    name: string;
    totalResidual: number;
    forecastedResidual: number;
  }>;
  onPayoutsApproved: () => void;
}

interface AgentPayoutStatus {
  agentId: string;
  name: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  payoutId?: string;
}

const BatchPayoutApproval: React.FC<BatchPayoutApprovalProps> = ({ 
  month, 
  agents,
  onPayoutsApproved
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [payoutStatuses, setPayoutStatuses] = useState<AgentPayoutStatus[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  
  // Format date for display
  const formattedMonth = format(new Date(`${month}-01`), 'MMMM yyyy');
  
  // Load payout statuses
  useEffect(() => {
    async function loadPayoutStatuses() {
      setLoadingStatus(true);
      
      try {
        const payoutMonth = `${month}-01`;
        
        const { data: payoutData, error: payoutError } = await supabase
          .from('agent_payout_history')
          .select('*')
          .eq('payout_month', payoutMonth);
        
        if (payoutError) {
          throw new Error(`Failed to fetch payout data: ${payoutError.message}`);
        }
        
        // Map agents to payout statuses
        const statuses = agents.map(agent => {
          const payout = payoutData?.find(p => p.agent_id === agent.id);
          
          return {
            agentId: agent.id,
            name: agent.name,
            amount: agent.totalResidual,
            status: payout?.status || 'pending',
            payoutId: payout?.id
          } as AgentPayoutStatus;
        });
        
        setPayoutStatuses(statuses);
        
        // Pre-select pending agents
        setSelectedAgents(
          statuses
            .filter(status => status.status === 'pending')
            .map(status => status.agentId)
        );
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load payout statuses",
          variant: "destructive"
        });
      }
      
      setLoadingStatus(false);
    }
    
    if (agents.length > 0) {
      loadPayoutStatuses();
    }
  }, [agents, month, supabase, toast]);
  
  // Toggle agent selection
  const toggleAgentSelection = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      setSelectedAgents(selectedAgents.filter(id => id !== agentId));
    } else {
      setSelectedAgents([...selectedAgents, agentId]);
    }
  };
  
  // Select all pending agents
  const selectAllPendingAgents = () => {
    const pendingAgentIds = payoutStatuses
      .filter(status => status.status === 'pending')
      .map(status => status.agentId);
    
    setSelectedAgents(pendingAgentIds);
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedAgents([]);
  };
  
  // Approve selected payouts
  const approveSelectedPayouts = async () => {
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
      const now = new Date().toISOString();
      let successCount = 0;
      let errorCount = 0;
      
      // Process each selected agent
      for (const agentId of selectedAgents) {
        const agentStatus = payoutStatuses.find(status => status.agentId === agentId);
        
        if (!agentStatus) continue;
        
        try {
          // If payout already exists, update it
          if (agentStatus.payoutId) {
            const { error } = await supabase
              .from('agent_payout_history')
              .update({
                amount: agentStatus.amount,
                status: 'approved',
                approved_by: adminData.id,
                approved_at: now,
                updated_at: now
              })
              .eq('id', agentStatus.payoutId);
            
            if (error) throw new Error(error.message);
          } else {
            // Create new payout record
            const { error } = await supabase
              .from('agent_payout_history')
              .insert({
                agent_id: agentId,
                payout_month: payoutMonth,
                amount: agentStatus.amount,
                status: 'approved',
                approved_by: adminData.id,
                approved_at: now
              });
            
            if (error) throw new Error(error.message);
          }
          
          // Create notification for the agent
          await supabase
            .from('notifications')
            .insert({
              user_id: agentId,
              title: `Commission Approved for ${formattedMonth}`,
              message: `Your commission of $${agentStatus.amount.toLocaleString()} for ${formattedMonth} has been approved.`,
              type: 'success'
            });
          
          successCount++;
        } catch (error) {
          console.error(`Error approving payout for agent ${agentId}:`, error);
          errorCount++;
        }
      }
      
      // Show result toast
      if (successCount > 0) {
        toast({
          title: "Payouts Approved",
          description: `Successfully approved ${successCount} payouts${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
          variant: errorCount > 0 ? "default" : "default"
        });
        
        // Refresh data
        onPayoutsApproved();
      } else if (errorCount > 0) {
        toast({
          title: "Approval Failed",
          description: `Failed to approve ${errorCount} payouts`,
          variant: "destructive"
        });
      }
      
      // Close dialog
      setConfirmDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve payouts",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };
  
  // Render status badge
  const renderStatusBadge = (status: 'pending' | 'approved' | 'paid') => {
    switch (status) {
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
  
  // Get counts
  const pendingCount = payoutStatuses.filter(status => status.status === 'pending').length;
  const approvedCount = payoutStatuses.filter(status => status.status === 'approved').length;
  const paidCount = payoutStatuses.filter(status => status.status === 'paid').length;
  
  // Calculate total selected amount
  const selectedAmount = payoutStatuses
    .filter(status => selectedAgents.includes(status.agentId))
    .reduce((sum, status) => sum + status.amount, 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Commission Approval</CardTitle>
        <CardDescription>
          Approve multiple agent commissions for {formattedMonth}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingStatus ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="bg-gray-100 rounded-lg p-3 flex flex-col items-center min-w-[100px]">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-2xl font-bold">{pendingCount}</span>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 flex flex-col items-center min-w-[100px]">
                <span className="text-sm text-muted-foreground">Approved</span>
                <span className="text-2xl font-bold text-blue-600">{approvedCount}</span>
              </div>
              <div className="bg-green-50 rounded-lg p-3 flex flex-col items-center min-w-[100px]">
                <span className="text-sm text-muted-foreground">Paid</span>
                <span className="text-2xl font-bold text-green-600">{paidCount}</span>
              </div>
            </div>
            
            {pendingCount === 0 ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>All Commissions Processed</AlertTitle>
                <AlertDescription>
                  All agent commissions for {formattedMonth} have been approved or paid.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={selectAllPendingAgents}
                      disabled={pendingCount === 0}
                    >
                      Select All Pending
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearSelection}
                      disabled={selectedAgents.length === 0}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{selectedAgents.length}</span> agents selected,
                    <span className="font-medium ml-1">${selectedAmount.toLocaleString()}</span> total
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payoutStatuses.map((status) => (
                        <TableRow key={status.agentId}>
                          <TableCell>
                            <Checkbox
                              checked={selectedAgents.includes(status.agentId)}
                              onCheckedChange={() => toggleAgentSelection(status.agentId)}
                              disabled={status.status !== 'pending'}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{status.name}</TableCell>
                          <TableCell className="text-right">${status.amount.toLocaleString()}</TableCell>
                          <TableCell>{renderStatusBadge(status.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={selectedAgents.length === 0 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Approve Selected ({selectedAgents.length})</>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Batch Approval</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve commissions for {selectedAgents.length} agents?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p><strong>Month:</strong> {formattedMonth}</p>
              <p><strong>Total Amount:</strong> ${selectedAmount.toLocaleString()}</p>
              <p><strong>Agents:</strong> {selectedAgents.length}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
              <Button onClick={approveSelectedPayouts} disabled={isLoading}>
                {isLoading ? "Processing..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

export default BatchPayoutApproval;
