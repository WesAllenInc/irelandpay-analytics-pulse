#!/usr/bin/env python
"""
Protected API endpoint to invoke the analytics pipeline from the frontend.
Only accessible by users with admin role.
"""
import os
import sys
import uuid
import json
import subprocess
from pathlib import Path
from http.server import BaseHTTPRequestHandler
from dotenv import load_dotenv
import jwt

# Add parent directory to path so we can import our modules
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv()

# Supabase JWT verification
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")  # JWT secret for verification
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")  # Service role key

class handler(BaseHTTPRequestHandler):
    """Handler for serverless function requests"""

    def verify_admin_token(self, auth_header):
        """Verify the JWT token and check if user has admin role"""
        if not auth_header or not auth_header.startswith('Bearer '):
            return False, "No authorization token provided"

        token = auth_header.replace('Bearer ', '')
        
        try:
            # Verify JWT token
            if not SUPABASE_JWT_SECRET:
                return False, "JWT secret not configured"
            
            # Decode token without verification if secret isn't available (for development)
            decoded = jwt.decode(
                token, 
                SUPABASE_JWT_SECRET, 
                algorithms=["HS256"],
                options={"verify_signature": bool(SUPABASE_JWT_SECRET)}
            )
            
            # Check for admin role in user_metadata
            user_roles = decoded.get("user_metadata", {}).get("roles", [])
            if "admin" not in user_roles:
                return False, "User does not have admin role"
            
            return True, decoded
            
        except jwt.InvalidTokenError as e:
            return False, f"Invalid token: {str(e)}"
        except Exception as e:
            return False, f"Error verifying token: {str(e)}"

    def run_analytics_pipeline(self):
        """Run the analytics pipeline script as a subprocess"""
        pipeline_script = str(Path(__file__).parent.parent / "scripts" / "run_pipeline.py")
        
        # Generate a unique run ID
        run_id = str(uuid.uuid4())
        
        try:
            # Start the pipeline as a background process
            subprocess.Popen([
                sys.executable, 
                pipeline_script,
                "--run-id", run_id
            ], 
            start_new_session=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE)
            
            return True, run_id
        except Exception as e:
            return False, str(e)

    def do_POST(self):
        """Handle POST requests"""
        try:
            # Check for authorization header
            auth_header = self.headers.get('Authorization')
            is_admin, auth_result = self.verify_admin_token(auth_header)
            
            if not is_admin:
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "error",
                    "message": f"Unauthorized: {auth_result}"
                }).encode('utf-8'))
                return
            
            # Run the analytics pipeline
            success, result = self.run_analytics_pipeline()
            
            if success:
                run_id = result
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "started",
                    "runId": run_id
                }).encode('utf-8'))
            else:
                error_message = result
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "error",
                    "message": f"Failed to start pipeline: {error_message}"
                }).encode('utf-8'))
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "error",
                "message": f"Server error: {str(e)}"
            }).encode('utf-8'))

    def do_GET(self):
        """Handle GET requests - returns error as this endpoint only accepts POST"""
        self.send_response(405)  # Method Not Allowed
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            "status": "error",
            "message": "This endpoint only accepts POST requests"
        }).encode('utf-8'))
