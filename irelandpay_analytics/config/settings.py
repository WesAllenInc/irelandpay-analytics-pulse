"""
Configuration settings for the Ireland Pay Analytics pipeline.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DATA_DIR = BASE_DIR / "data" / "processed"
LOGS_DIR = BASE_DIR / "data" / "logs"

# Create directories if they don't exist
for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, LOGS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Database tables
MERCHANTS_TABLE = "merchant_data"
RESIDUALS_TABLE = "residual_data"

# Residual calculation settings
OFFICE_FEE_PERCENTAGE = float(os.getenv("OFFICE_FEE_PERCENTAGE", "0.1"))  # Default 10%
EQUIPMENT_RECOVERY_RATE = float(os.getenv("EQUIPMENT_RECOVERY_RATE", "0.05"))  # Default 5%

# Email notification settings
ENABLE_EMAIL_NOTIFICATIONS = os.getenv("ENABLE_EMAIL_NOTIFICATIONS", "False").lower() == "true"
EMAIL_SENDER = os.getenv("EMAIL_SENDER")
EMAIL_RECIPIENTS = os.getenv("EMAIL_RECIPIENTS", "").split(",")
EMAIL_SERVER = os.getenv("EMAIL_SERVER")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

# Slack notification settings
ENABLE_SLACK_NOTIFICATIONS = os.getenv("ENABLE_SLACK_NOTIFICATIONS", "False").lower() == "true"
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")
