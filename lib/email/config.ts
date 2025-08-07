import { Resend } from 'resend';

// Only create Resend instance if API key is available
// This prevents build-time errors when the key is not set
export const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Helper function to check if email service is configured
export const isEmailServiceConfigured = () => {
  return !!process.env.RESEND_API_KEY;
};

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