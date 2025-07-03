import { createSupabaseServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { validateRequest, successResponse, errorResponse } from '@/lib/api-utils';
import { logRequest, logError } from '@/lib/logging';

// Define validation schema for the request body
const ApprovalNotificationSchema = z.object({
  newUserEmail: z.string().email('Invalid email format'),
  newUserName: z.string().min(1, 'User name is required')
});

// Define response schema
const ApprovalResponseSchema = z.object({
  success: z.boolean()
});

export async function POST(request: Request) {
  // Log request with safe metadata only
  logRequest(request, {
    metadata: { endpoint: 'api/send-approval-notification' }
  });
  
  try {
    // Validate the request body
    const validation = await validateRequest(
      request, 
      ApprovalNotificationSchema as any,
      'Invalid notification request parameters'
    );
    
    // Return early if validation failed
    if (validation.response) return validation.response;
    
    // Extract validated data
    const validatedData = validation.data! as {
      newUserEmail: string;
      newUserName: string;
    };
    const { newUserEmail, newUserName } = validatedData;
    
    const supabase = createSupabaseServerClient();
    
    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    
    // Email content
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@irelandpay.com',
      to: 'Jmarkey@irelandpay.com',
      subject: 'New User Registration Approval Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New User Registration Approval Required</h2>
          <p>A new user has registered for the Ireland Pay Analytics portal and requires your approval:</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Name:</strong> ${newUserName}</p>
            <p><strong>Email:</strong> ${newUserEmail}</p>
            <p><strong>Registration Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> Pending Approval</p>
          </div>
          
          <p>Please log in to the admin dashboard to approve or reject this user:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://analytics.irelandpay.com'}/admin/user-management" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 5px; margin-top: 10px;">
            Go to User Management
          </a>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 0.9em;">
            This is an automated message from the Ireland Pay Analytics Portal.
          </p>
        </div>
      `,
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    // Log the notification in the database (optional)
    await supabase.from('admin_notifications').insert({
      type: 'user_approval',
      content: `New user registration: ${newUserName} (${newUserEmail})`,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    
    // Return standardized successful response
    return successResponse({ success: true });
  } catch (error: any) {
    // Log the error with structured logging
    logError('Error sending approval notification', error instanceof Error ? error : new Error(String(error)));
    
    // Return standardized error response
    return errorResponse('Failed to send approval notification', 500, error.message);
  }
}
