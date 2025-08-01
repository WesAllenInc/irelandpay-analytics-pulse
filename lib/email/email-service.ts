import { resend, emailConfig } from './config';
import { SyncSuccessEmail } from '@/emails/SyncSuccessEmail';
import { SyncFailureEmail } from '@/emails/SyncFailureEmail';
import { DailySummaryEmail } from '@/emails/DailySummaryEmail';
import { render } from '@react-email/render';
import { format } from 'date-fns';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Types
interface SyncSuccessData {
  syncId: string;
  syncType: 'daily' | 'manual' | 'initial';
  startTime: Date;
  endTime: Date;
  stats: {
    merchantsNew: number;
    merchantsUpdated: number;
    transactionsCount: number;
    residualsCount: number;
    duration: number;
  };
}

interface SyncFailureData {
  syncId: string;
  syncType: 'daily' | 'manual' | 'initial';
  error: {
    message: string;
    details?: any;
  };
  failedAt: Date;
  lastSuccessfulSync?: Date;
  logs?: string[];
}

interface DailySummaryData {
  date: Date;
  syncs: Array<{
    id: string;
    type: 'daily' | 'manual' | 'initial';
    status: 'success' | 'failure' | 'partial';
    startTime: Date;
    endTime: Date;
    merchantsNew: number;
    merchantsUpdated: number;
    transactionsCount: number;
    residualsCount: number;
    duration: number;
    error?: string;
  }>;
  totalMerchants: number;
  totalTransactions: number;
  totalVolume: number;
  issues: string[];
}

interface EmailQueueItem {
  id: string;
  to: string;
  subject: string;
  html: string;
  category: string;
  priority: 'high' | 'normal' | 'low';
  attempts: number;
  createdAt: Date;
  messageId?: string;
  lastError?: string;
}

export class EmailService {
  private queue: EmailQueueItem[] = [];
  private processing = false;
  
  /**
   * Send sync success notification
   */
  async sendSyncSuccess(data: SyncSuccessData): Promise<void> {
    const adminEmail = await this.getAdminEmail();
    if (!adminEmail) {
      console.error('No admin email configured');
      return;
    }

    const html = render(SyncSuccessEmail({
      syncId: data.syncId,
      syncType: data.syncType,
      startTime: data.startTime,
      endTime: data.endTime,
      stats: data.stats,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    }));

    await this.queueEmail({
      to: adminEmail,
      subject: `✅ Sync Completed Successfully - ${format(data.startTime, 'MMM d, h:mm a')}`,
      html,
      category: emailConfig.categories.syncNotification,
      priority: 'normal'
    });
  }

  /**
   * Send sync failure notification
   */
  async sendSyncFailure(data: SyncFailureData): Promise<void> {
    const adminEmail = await this.getAdminEmail();
    if (!adminEmail) {
      console.error('No admin email configured');
      return;
    }

    const html = render(SyncFailureEmail({
      syncId: data.syncId,
      syncType: data.syncType,
      error: data.error,
      failedAt: data.failedAt,
      lastSuccessfulSync: data.lastSuccessfulSync,
      adminUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/sync-monitoring`,
      logs: data.logs
    }));

    await this.queueEmail({
      to: adminEmail,
      subject: `🚨 URGENT: Sync Failed - Action Required`,
      html,
      category: emailConfig.categories.errorAlert,
      priority: 'high'
    });
  }

  /**
   * Send daily summary report
   */
  async sendDailySummary(data: DailySummaryData): Promise<void> {
    const adminEmail = await this.getAdminEmail();
    if (!adminEmail) return;

    const html = render(DailySummaryEmail({
      date: data.date,
      syncs: data.syncs,
      totalMerchants: data.totalMerchants,
      totalTransactions: data.totalTransactions,
      totalVolume: data.totalVolume,
      issues: data.issues,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    }));

    await this.queueEmail({
      to: adminEmail,
      subject: `Daily Summary - ${format(data.date, 'MMM d, yyyy')}`,
      html,
      category: emailConfig.categories.report,
      priority: 'low'
    });
  }

  /**
   * Queue email for sending with retry logic
   */
  private async queueEmail(email: Omit<EmailQueueItem, 'id' | 'attempts' | 'createdAt'>): Promise<void> {
    this.queue.push({
      ...email,
      id: crypto.randomUUID(),
      attempts: 0,
      createdAt: new Date()
    });

    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process email queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;

    while (this.queue.length > 0) {
      // Sort by priority
      this.queue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      const email = this.queue.shift();
      if (!email) continue;

      try {
        await this.sendEmail(email);
        await this.logEmailSent(email);
      } catch (error) {
        await this.handleEmailError(email, error);
      }

      // Rate limiting: 3 emails per second max
      await this.delay(334);
    }

    this.processing = false;
  }

  /**
   * Send individual email
   */
  private async sendEmail(email: EmailQueueItem): Promise<void> {
    const { data, error } = await resend.emails.send({
      from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
      to: email.to,
      subject: email.subject,
      html: email.html,
      replyTo: emailConfig.replyTo,
      tags: [
        { name: 'category', value: email.category },
        { name: 'app', value: 'irelandpay-analytics' }
      ]
    });

    if (error) {
      throw new Error(`Email send failed: ${error.message}`);
    }

    email.messageId = data?.id;
  }

  /**
   * Handle email sending errors with retry
   */
  private async handleEmailError(
    email: EmailQueueItem, 
    error: Error
  ): Promise<void> {
    email.attempts++;
    email.lastError = error.message;

    if (email.attempts < 3) {
      // Exponential backoff retry
      const delay = Math.pow(2, email.attempts) * 1000;
      setTimeout(() => {
        this.queue.push(email);
        if (!this.processing) {
          this.processQueue();
        }
      }, delay);
    } else {
      // Log permanent failure
      await this.logEmailFailure(email, error);
    }
  }

  /**
   * Get admin email from database
   */
  private async getAdminEmail(): Promise<string | null> {
    try {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase
        .from('user_roles')
        .select('users(email)')
        .eq('role', 'admin')
        .single();

      return data?.users?.email || null;
    } catch (error) {
      console.error('Failed to get admin email:', error);
      return null;
    }
  }

  /**
   * Log successful email send
   */
  private async logEmailSent(email: EmailQueueItem): Promise<void> {
    try {
      const supabase = createSupabaseServiceClient();
      await supabase
        .from('email_logs')
        .insert({
          message_id: email.messageId,
          to_email: email.to,
          subject: email.subject,
          category: email.category,
          status: 'sent',
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log email sent:', error);
    }
  }

  /**
   * Log email failure
   */
  private async logEmailFailure(email: EmailQueueItem, error: Error): Promise<void> {
    try {
      const supabase = createSupabaseServiceClient();
      await supabase
        .from('email_logs')
        .insert({
          to_email: email.to,
          subject: email.subject,
          category: email.category,
          status: 'failed',
          attempts: email.attempts,
          last_error: error.message,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log email failure:', error);
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
export const emailService = new EmailService(); 