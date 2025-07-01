#!/usr/bin/env python
"""
Tests for the run-analytics API endpoint to verify authentication and authorization.
"""
import os
import sys
import json
import unittest
from unittest import mock
import jwt
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path so we can import our modules
sys.path.append(str(Path(__file__).parent.parent))

# Mock the BaseHTTPRequestHandler for testing
class MockRequest:
    def __init__(self, headers=None):
        self.headers = headers or {}

class MockResponse:
    def __init__(self):
        self.status_code = None
        self.headers = {}
        self.body = None
    
    def send_response(self, status_code):
        self.status_code = status_code
    
    def send_header(self, key, value):
        self.headers[key] = value
    
    def end_headers(self):
        pass
    
    def write(self, body):
        self.body = body

# Import the handler for testing
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
from run_analytics import handler

class TestRunAnalytics(unittest.TestCase):
    """Test the run-analytics API endpoint"""

    def setUp(self):
        """Set up test environment"""
        # Create fake JWT secret for testing
        self.jwt_secret = "test_secret"
        
        # Set up environment variables for testing
        self.original_env = os.environ.copy()
        os.environ["SUPABASE_URL"] = "https://test.supabase.co"
        os.environ["SUPABASE_JWT_SECRET"] = self.jwt_secret
        os.environ["SUPABASE_KEY"] = "test_service_key"
        
        # Create handler instance
        self.handler = handler()
        
        # Mock response
        self.mock_response = MockResponse()
        self.handler.send_response = self.mock_response.send_response
        self.handler.send_header = self.mock_response.send_header
        self.handler.end_headers = self.mock_response.end_headers
        self.handler.wfile = mock.MagicMock()
        self.handler.wfile.write = self.mock_response.write
    
    def tearDown(self):
        """Clean up test environment"""
        # Restore original environment
        os.environ.clear()
        os.environ.update(self.original_env)
    
    def create_token(self, has_admin_role=False):
        """Create a JWT token for testing"""
        payload = {
            "sub": "user123",
            "exp": datetime.utcnow() + timedelta(hours=1),
            "user_metadata": {
                "roles": ["admin"] if has_admin_role else ["user"]
            }
        }
        return jwt.encode(payload, self.jwt_secret, algorithm="HS256")
    
    @mock.patch('run_analytics.handler.run_analytics_pipeline')
    def test_admin_access_allowed(self, mock_run_pipeline):
        """Test that admin users can access the endpoint"""
        # Mock the pipeline execution to return success
        mock_run_pipeline.return_value = (True, "test-uuid")
        
        # Set up request with admin token
        token = self.create_token(has_admin_role=True)
        self.handler.headers = {"Authorization": f"Bearer {token}"}
        
        # Execute request
        self.handler.do_POST()
        
        # Verify response
        self.assertEqual(self.mock_response.status_code, 200)
        response_data = json.loads(self.mock_response.body)
        self.assertEqual(response_data["status"], "started")
        self.assertEqual(response_data["runId"], "test-uuid")
    
    @mock.patch('run_analytics.handler.run_analytics_pipeline')
    def test_non_admin_access_denied(self, mock_run_pipeline):
        """Test that non-admin users cannot access the endpoint"""
        # Set up request with non-admin token
        token = self.create_token(has_admin_role=False)
        self.handler.headers = {"Authorization": f"Bearer {token}"}
        
        # Execute request
        self.handler.do_POST()
        
        # Verify response
        self.assertEqual(self.mock_response.status_code, 403)
        response_data = json.loads(self.mock_response.body)
        self.assertEqual(response_data["status"], "error")
        self.assertIn("User does not have admin role", response_data["message"])
        
        # Verify pipeline was not executed
        mock_run_pipeline.assert_not_called()
    
    @mock.patch('run_analytics.handler.run_analytics_pipeline')
    def test_missing_token_denied(self, mock_run_pipeline):
        """Test that requests without token are denied"""
        # Set up request without token
        self.handler.headers = {}
        
        # Execute request
        self.handler.do_POST()
        
        # Verify response
        self.assertEqual(self.mock_response.status_code, 403)
        response_data = json.loads(self.mock_response.body)
        self.assertEqual(response_data["status"], "error")
        self.assertIn("No authorization token", response_data["message"])
        
        # Verify pipeline was not executed
        mock_run_pipeline.assert_not_called()
    
    @mock.patch('run_analytics.handler.run_analytics_pipeline')
    def test_invalid_token_denied(self, mock_run_pipeline):
        """Test that requests with invalid token are denied"""
        # Set up request with invalid token
        self.handler.headers = {"Authorization": "Bearer invalid.token.here"}
        
        # Execute request
        self.handler.do_POST()
        
        # Verify response
        self.assertEqual(self.mock_response.status_code, 403)
        response_data = json.loads(self.mock_response.body)
        self.assertEqual(response_data["status"], "error")
        self.assertIn("Invalid token", response_data["message"])
        
        # Verify pipeline was not executed
        mock_run_pipeline.assert_not_called()
        
    def test_get_request_not_allowed(self):
        """Test that GET requests are not allowed"""
        # Execute GET request
        self.handler.do_GET()
        
        # Verify response
        self.assertEqual(self.mock_response.status_code, 405)
        response_data = json.loads(self.mock_response.body)
        self.assertEqual(response_data["status"], "error")
        self.assertIn("only accepts POST", response_data["message"])

if __name__ == "__main__":
    unittest.main()
