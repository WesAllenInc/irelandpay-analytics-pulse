import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not configured');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
export const emailConfig = {
  from: {
    name: 'IrelandPay Analytics',
    email: 'analytics@irelandpay.com' // Must be verified in Resend
  },
  replyTo: 'support@irelandpay.com',
  categories: {
    syncNotification: 'sync-notification',
    errorAlert: 'error-alert',
    systemAlert: 'system-alert',
    report: 'report'
  }
}; 