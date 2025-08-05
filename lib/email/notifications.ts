import { Resend } from 'resend'
import { getAdminEmail } from '@/lib/auth/admin-check'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SyncStats {
  merchantsCount: number
  transactionsCount: number
  residualsCount: number
  duration: number
  errors: string[]
}

export async function notifyAdmin(subject: string, content: string | Error) {
  const adminEmail = await getAdminEmail()
  
  if (!adminEmail) {
    console.error('No admin email configured for notifications')
    return
  }
  
  const html = content instanceof Error 
    ? `<p>Error: ${content.message}</p><pre>${content.stack}</pre>`
    : `<p>${content}</p>`
  
  try {
    await resend.emails.send({
      from: 'IrelandPay Analytics <noreply@irelandpay.com>',
      to: adminEmail,
      subject: `[IrelandPay Analytics] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e40af; margin: 0 0 10px 0;">IrelandPay Analytics</h2>
            <p style="color: #64748b; margin: 0;">${subject}</p>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            ${html}
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              This is an automated message from IrelandPay Analytics. 
              <br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://analytics.irelandpay.com'}/dashboard" style="color: #1e40af;">
                View Dashboard
              </a>
            </p>
          </div>
        </div>
      `
    })
    
    console.log(`Notification sent to ${adminEmail}: ${subject}`)
  } catch (error) {
    console.error('Failed to send email notification:', error)
  }
}

export const emailTemplates = {
  syncSuccess: (stats: SyncStats) => ({
    subject: 'Daily Sync Completed Successfully',
    html: `
      <h3 style="color: #059669; margin-top: 0;">✅ Sync Completed Successfully</h3>
      
      <p>The scheduled sync has completed successfully. Here's a summary of what was processed:</p>
      
      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h4 style="margin: 0 0 10px 0; color: #059669;">Sync Summary</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li><strong>Merchants processed:</strong> ${stats.merchantsCount}</li>
          <li><strong>Transactions processed:</strong> ${stats.transactionsCount}</li>
          <li><strong>Residuals processed:</strong> ${stats.residualsCount}</li>
          <li><strong>Duration:</strong> ${Math.round(stats.duration / 1000)} seconds</li>
        </ul>
      </div>
      
      <p>Your analytics dashboard has been updated with the latest data from Ireland Pay CRM.</p>
    `
  }),
  
  syncFailure: (error: Error) => ({
    subject: 'Daily Sync Failed - Action Required',
    html: `
      <h3 style="color: #dc2626; margin-top: 0;">❌ Sync Failed - Action Required</h3>
      
      <p>The scheduled sync encountered an error and requires your attention.</p>
      
      <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626;">
        <h4 style="margin: 0 0 10px 0; color: #dc2626;">Error Details</h4>
        <p style="margin: 0; font-family: monospace; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
          ${error.message}
        </p>
      </div>
      
      <p>Please review the sync settings and take appropriate action:</p>
      <ul>
        <li>Check your Ireland Pay CRM API credentials</li>
        <li>Verify network connectivity</li>
        <li>Review the sync logs for more details</li>
      </ul>
      
      <div style="margin-top: 20px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://analytics.irelandpay.com'}/dashboard/settings?tab=sync" 
           style="background-color: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Sync Settings
        </a>
      </div>
    `
  }),
  
  setupComplete: (adminEmail: string) => ({
    subject: 'IrelandPay Analytics Setup Complete',
    html: `
      <h3 style="color: #059669; margin-top: 0;">🎉 Setup Complete!</h3>
      
      <p>Your IrelandPay Analytics system has been successfully configured and is ready to use.</p>
      
      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h4 style="margin: 0 0 10px 0; color: #059669;">What's Next</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Log in to your dashboard with your admin account</li>
          <li>Review your merchant data and analytics</li>
          <li>Configure additional users if needed</li>
          <li>Monitor sync status and notifications</li>
        </ul>
      </div>
      
      <p><strong>Admin Email:</strong> ${adminEmail}</p>
      <p><strong>Temporary Password:</strong> TempPassword123!</p>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>Important:</strong> Please change your password immediately after your first login.
        </p>
      </div>
      
      <div style="margin-top: 20px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://analytics.irelandpay.com'}/dashboard" 
           style="background-color: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Access Dashboard
        </a>
      </div>
    `
  })
} 