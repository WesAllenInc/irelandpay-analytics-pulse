"""
Notification module for sending email and Slack alerts.
"""
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Dict, List, Any, Optional
from pathlib import Path
import requests
import json

from irelandpay_analytics.config import settings

logger = logging.getLogger(__name__)

class Notifier:
    """Sends email and Slack notifications."""
    
    def __init__(self):
        """Initialize the notifier."""
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.sender_email = settings.SENDER_EMAIL
        self.slack_webhook_url = settings.SLACK_WEBHOOK_URL
        
        logger.info("Initialized Notifier")
    
    def send_email(self, recipient_emails: List[str], subject: str, 
                  body: str, attachments: Optional[List[str]] = None) -> bool:
        """
        Send an email notification.
        
        Args:
            recipient_emails: List of recipient email addresses
            subject: Email subject
            body: Email body (HTML)
            attachments: Optional list of file paths to attach
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.smtp_server or not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP settings not configured. Email notification skipped.")
            return False
        
        try:
            # Create message
            message = MIMEMultipart()
            message["From"] = self.sender_email
            message["To"] = ", ".join(recipient_emails)
            message["Subject"] = subject
            
            # Attach body
            message.attach(MIMEText(body, "html"))
            
            # Attach files if provided
            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        with open(file_path, "rb") as attachment:
                            part = MIMEApplication(attachment.read(), Name=os.path.basename(file_path))
                        
                        part['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_path)}"'
                        message.attach(part)
                    else:
                        logger.warning(f"Attachment file not found: {file_path}")
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Email notification sent to {', '.join(recipient_emails)}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {str(e)}")
            return False
    
    def send_slack_message(self, message: str, blocks: Optional[List[Dict[str, Any]]] = None) -> bool:
        """
        Send a Slack notification.
        
        Args:
            message: Slack message text
            blocks: Optional Slack blocks for rich formatting
            
        Returns:
            True if message was sent successfully, False otherwise
        """
        if not self.slack_webhook_url:
            logger.warning("Slack webhook URL not configured. Slack notification skipped.")
            return False
        
        try:
            payload = {"text": message}
            
            if blocks:
                payload["blocks"] = blocks
            
            response = requests.post(
                self.slack_webhook_url,
                data=json.dumps(payload),
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                logger.info("Slack notification sent successfully")
                return True
            else:
                logger.error(f"Failed to send Slack notification. Status code: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {str(e)}")
            return False
    
    def notify_pipeline_success(self, month: str, stats: Dict[str, Any], 
                              report_files: Optional[List[str]] = None) -> None:
        """
        Send notifications for a successful pipeline run.
        
        Args:
            month: Month in format YYYY-MM
            stats: Dictionary with pipeline statistics
            report_files: Optional list of report files to attach to email
        """
        logger.info(f"Sending pipeline success notifications for {month}")
        
        # Email notification
        subject = f"Ireland Pay Analytics Pipeline Success - {month}"
        
        # Create HTML email body
        email_body = f"""
        <html>
        <body>
            <h2>Ireland Pay Analytics Pipeline Completed Successfully</h2>
            <p>The analytics pipeline for <strong>{month}</strong> has completed successfully.</p>
            
            <h3>Summary:</h3>
            <ul>
                <li>Total Merchants: {stats.get('merchant_count', 0):,}</li>
                <li>Total Volume: ${stats.get('total_volume', 0):,.2f}</li>
                <li>Total Profit: ${stats.get('total_profit', 0):,.2f}</li>
                <li>Processing Time: {stats.get('processing_time', 0):.2f} seconds</li>
            </ul>
            
            <p>Please find attached reports for your review.</p>
            
            <p>This is an automated message from the Ireland Pay Analytics Pipeline.</p>
        </body>
        </html>
        """
        
        # Send email notification
        if settings.EMAIL_RECIPIENTS:
            recipients = settings.EMAIL_RECIPIENTS.split(',')
            self.send_email(recipients, subject, email_body, report_files)
        
        # Slack notification
        slack_message = f"✅ Ireland Pay Analytics Pipeline for {month} completed successfully!"
        
        slack_blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"✅ Analytics Pipeline Success - {month}"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Total Merchants:*\n{stats.get('merchant_count', 0):,}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Total Volume:*\n${stats.get('total_volume', 0):,.2f}"
                    }
                ]
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Total Profit:*\n${stats.get('total_profit', 0):,.2f}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Processing Time:*\n{stats.get('processing_time', 0):.2f}s"
                    }
                ]
            }
        ]
        
        # Send Slack notification
        if self.slack_webhook_url:
            self.send_slack_message(slack_message, slack_blocks)
    
    def notify_pipeline_error(self, month: str, error_message: str, 
                            error_details: Optional[str] = None) -> None:
        """
        Send notifications for a pipeline error.
        
        Args:
            month: Month in format YYYY-MM
            error_message: Brief error message
            error_details: Optional detailed error information
        """
        logger.info(f"Sending pipeline error notifications for {month}")
        
        # Email notification
        subject = f"⚠️ Ireland Pay Analytics Pipeline Error - {month}"
        
        # Create HTML email body
        email_body = f"""
        <html>
        <body>
            <h2>Ireland Pay Analytics Pipeline Error</h2>
            <p>The analytics pipeline for <strong>{month}</strong> encountered an error.</p>
            
            <h3>Error Message:</h3>
            <p style="color: red;">{error_message}</p>
            
            {f'<h3>Error Details:</h3><pre>{error_details}</pre>' if error_details else ''}
            
            <p>Please review the logs and take appropriate action.</p>
            
            <p>This is an automated message from the Ireland Pay Analytics Pipeline.</p>
        </body>
        </html>
        """
        
        # Send email notification
        if settings.EMAIL_RECIPIENTS:
            recipients = settings.EMAIL_RECIPIENTS.split(',')
            self.send_email(recipients, subject, email_body)
        
        # Slack notification
        slack_message = f"⚠️ Ireland Pay Analytics Pipeline Error for {month}: {error_message}"
        
        slack_blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"⚠️ Analytics Pipeline Error - {month}"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Error Message:*\n{error_message}"
                }
            }
        ]
        
        if error_details:
            slack_blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Error Details:*\n```{error_details[:1000]}```"
                }
            })
        
        # Send Slack notification
        if self.slack_webhook_url:
            self.send_slack_message(slack_message, slack_blocks)
    
    def notify_agent_statement_ready(self, agent_name: str, month: str, 
                                   statement_path: str) -> None:
        """
        Send notification that an agent statement is ready.
        
        Args:
            agent_name: Name of the agent
            month: Month in format YYYY-MM
            statement_path: Path to the agent statement PDF
        """
        logger.info(f"Sending agent statement notification for {agent_name} for {month}")
        
        # Email notification
        subject = f"Ireland Pay Agent Statement - {month}"
        
        # Create HTML email body
        email_body = f"""
        <html>
        <body>
            <h2>Ireland Pay Agent Statement</h2>
            <p>Dear {agent_name},</p>
            
            <p>Your agent statement for <strong>{month}</strong> is now available.</p>
            
            <p>Please find your statement attached to this email.</p>
            
            <p>If you have any questions or concerns, please contact your account manager.</p>
            
            <p>Thank you for your partnership with Ireland Pay.</p>
        </body>
        </html>
        """
        
        # Send email notification
        # Note: In a real implementation, you would look up the agent's email address
        # For now, we'll just log this
        logger.info(f"Would send agent statement to {agent_name} if email was available")
        
        # For demo purposes, we can send to the admin email
        if settings.EMAIL_RECIPIENTS:
            recipients = settings.EMAIL_RECIPIENTS.split(',')
            self.send_email(recipients, subject, email_body, [statement_path])
