"""
Unit tests for the Notifier module.
"""
import os
import sys
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock, mock_open

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.reports.notifier import Notifier

class TestNotifier:
    """Test cases for the Notifier class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Create a patched Notifier with mocked settings
        with patch('irelandpay_analytics.reports.notifier.settings') as mock_settings:
            # Mock settings
            mock_settings.SMTP_SERVER = 'smtp.example.com'
            mock_settings.SMTP_PORT = 587
            mock_settings.SMTP_USERNAME = 'test@example.com'
            # Use a placeholder value for test purposes
            mock_settings.SMTP_PASSWORD = 'TEST_PASSWORD_PLACEHOLDER'
            mock_settings.EMAIL_FROM = 'reports@irelandpay.com'
            mock_settings.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
            
            self.notifier = Notifier()
        
        # Sample agent data
        self.agent_data = {
            'agent_name': 'Test Agent',
            'email': 'agent@example.com',
            'statement_path': '/path/to/statement.pdf'
        }
        
        # Sample error data
        self.error_data = {
            'error_message': 'Test error message',
            'error_traceback': 'Traceback: ...',
            'step': 'data_processing'
        }
        
        # Sample success data
        self.success_data = {
            'month': '2023-05',
            'merchants_processed': 100,
            'residuals_processed': 50,
            'agents_processed': 10,
            'report_paths': ['/path/to/report1.pdf', '/path/to/report2.pdf'],
            'dashboard_paths': ['/path/to/dashboard1.json', '/path/to/dashboard2.json']
        }
    
    @patch('irelandpay_analytics.reports.notifier.smtplib.SMTP')
    def test_send_email(self, mock_smtp):
        """Test sending an email."""
        # Set up mock SMTP instance
        mock_smtp_instance = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_smtp_instance
        
        # Call the method
        result = self.notifier.send_email(
            to_email='test@example.com',
            subject='Test Subject',
            body='Test Body',
            is_html=False
        )
        
        # Verify the results
        assert result is True
        mock_smtp.assert_called_once_with('smtp.example.com', 587)
        mock_smtp_instance.starttls.assert_called_once()
        mock_smtp_instance.login.assert_called_once_with('test@example.com', 'password')
        mock_smtp_instance.sendmail.assert_called_once()
    
    @patch('irelandpay_analytics.reports.notifier.smtplib.SMTP')
    def test_send_email_with_attachment(self, mock_smtp):
        """Test sending an email with attachment."""
        # Set up mock SMTP instance
        mock_smtp_instance = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_smtp_instance
        
        # Mock file open
        with patch('builtins.open', mock_open(read_data=b'file_content')) as mock_file:
            # Call the method
            result = self.notifier.send_email(
                to_email='test@example.com',
                subject='Test Subject',
                body='Test Body',
                is_html=False,
                attachment_path='/path/to/attachment.pdf'
            )
        
        # Verify the results
        assert result is True
        mock_smtp.assert_called_once_with('smtp.example.com', 587)
        mock_smtp_instance.starttls.assert_called_once()
        mock_smtp_instance.login.assert_called_once_with('test@example.com', 'password')
        mock_smtp_instance.sendmail.assert_called_once()
        mock_file.assert_called_once_with('/path/to/attachment.pdf', 'rb')
    
    @patch('irelandpay_analytics.reports.notifier.smtplib.SMTP')
    def test_send_email_error(self, mock_smtp):
        """Test sending an email with error."""
        # Set up mock SMTP instance to raise an exception
        mock_smtp.return_value.__enter__.side_effect = Exception('SMTP Error')
        
        # Call the method
        result = self.notifier.send_email(
            to_email='test@example.com',
            subject='Test Subject',
            body='Test Body',
            is_html=False
        )
        
        # Verify the results
        assert result is False
    
    @patch('irelandpay_analytics.reports.notifier.requests.post')
    def test_send_slack_notification(self, mock_post):
        """Test sending a Slack notification."""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        # Call the method
        result = self.notifier.send_slack_notification(
            message='Test Message',
            blocks=None
        )
        
        # Verify the results
        assert result is True
        mock_post.assert_called_once()
        assert mock_post.call_args[0][0] == 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
    
    @patch('irelandpay_analytics.reports.notifier.requests.post')
    def test_send_slack_notification_with_blocks(self, mock_post):
        """Test sending a Slack notification with blocks."""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        # Call the method
        result = self.notifier.send_slack_notification(
            message='Test Message',
            blocks=[{"type": "section", "text": {"type": "mrkdwn", "text": "Test Block"}}]
        )
        
        # Verify the results
        assert result is True
        mock_post.assert_called_once()
        assert mock_post.call_args[0][0] == 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
    
    @patch('irelandpay_analytics.reports.notifier.requests.post')
    def test_send_slack_notification_error(self, mock_post):
        """Test sending a Slack notification with error."""
        # Set up mock response with error
        mock_post.side_effect = Exception('Slack API Error')
        
        # Call the method
        result = self.notifier.send_slack_notification(
            message='Test Message',
            blocks=None
        )
        
        # Verify the results
        assert result is False
    
    @patch.object(Notifier, 'send_email')
    @patch.object(Notifier, 'send_slack_notification')
    def test_notify_agent_statement_ready(self, mock_slack, mock_email):
        """Test notifying an agent that their statement is ready."""
        # Set up mock returns
        mock_email.return_value = True
        mock_slack.return_value = True
        
        # Call the method
        result = self.notifier.notify_agent_statement_ready(self.agent_data)
        
        # Verify the results
        assert result is True
        mock_email.assert_called_once()
        assert mock_email.call_args[1]['to_email'] == 'agent@example.com'
        assert mock_email.call_args[1]['attachment_path'] == '/path/to/statement.pdf'
        mock_slack.assert_called_once()
    
    @patch.object(Notifier, 'send_email')
    @patch.object(Notifier, 'send_slack_notification')
    def test_notify_pipeline_error(self, mock_slack, mock_email):
        """Test notifying about a pipeline error."""
        # Set up mock returns
        mock_email.return_value = True
        mock_slack.return_value = True
        
        # Call the method
        result = self.notifier.notify_pipeline_error(
            self.error_data,
            admin_email='admin@example.com'
        )
        
        # Verify the results
        assert result is True
        mock_email.assert_called_once()
        assert mock_email.call_args[1]['to_email'] == 'admin@example.com'
        assert 'Test error message' in mock_email.call_args[1]['body']
        mock_slack.assert_called_once()
    
    @patch.object(Notifier, 'send_email')
    @patch.object(Notifier, 'send_slack_notification')
    def test_notify_pipeline_success(self, mock_slack, mock_email):
        """Test notifying about pipeline success."""
        # Set up mock returns
        mock_email.return_value = True
        mock_slack.return_value = True
        
        # Call the method
        result = self.notifier.notify_pipeline_success(
            self.success_data,
            admin_email='admin@example.com'
        )
        
        # Verify the results
        assert result is True
        mock_email.assert_called_once()
        assert mock_email.call_args[1]['to_email'] == 'admin@example.com'
        assert '2023-05' in mock_email.call_args[1]['body']
        mock_slack.assert_called_once()
    
    def test_generate_html_email(self):
        """Test generating an HTML email."""
        # Call the method
        html = self.notifier._generate_html_email(
            title='Test Title',
            content='Test Content',
            footer='Test Footer'
        )
        
        # Verify the results
        assert isinstance(html, str)
        assert 'Test Title' in html
        assert 'Test Content' in html
        assert 'Test Footer' in html
    
    def test_generate_agent_email_content(self):
        """Test generating agent email content."""
        # Call the method
        content = self.notifier._generate_agent_email_content(self.agent_data)
        
        # Verify the results
        assert isinstance(content, str)
        assert 'Test Agent' in content
    
    def test_generate_error_email_content(self):
        """Test generating error email content."""
        # Call the method
        content = self.notifier._generate_error_email_content(self.error_data)
        
        # Verify the results
        assert isinstance(content, str)
        assert 'Test error message' in content
        assert 'data_processing' in content
    
    def test_generate_success_email_content(self):
        """Test generating success email content."""
        # Call the method
        content = self.notifier._generate_success_email_content(self.success_data)
        
        # Verify the results
        assert isinstance(content, str)
        assert '2023-05' in content
        assert '100' in content  # merchants_processed
        assert '50' in content   # residuals_processed
        assert '10' in content   # agents_processed
