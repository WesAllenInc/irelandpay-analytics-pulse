"""
Excel loader module for loading and parsing Excel files.
"""
import logging
import os
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import pandas as pd
import numpy as np
from datetime import datetime

from irelandpay_analytics.config import settings

logger = logging.getLogger(__name__)

class ExcelLoader:
    """Loads and parses Excel files from the raw data directory."""
    
    def __init__(self, raw_dir: Optional[Path] = None):
        """
        Initialize the Excel loader.
        
        Args:
            raw_dir: Directory containing raw Excel files (defaults to settings.RAW_DATA_DIR)
        """
        self.raw_dir = raw_dir or settings.RAW_DATA_DIR
        logger.info(f"Initialized ExcelLoader with raw directory: {self.raw_dir}")
    
    def list_excel_files(self, pattern: str = "*.xlsx") -> List[Path]:
        """
        List all Excel files in the raw data directory.
        
        Args:
            pattern: File pattern to match (default: "*.xlsx")
            
        Returns:
            List of Path objects for Excel files
        """
        files = list(self.raw_dir.glob(pattern))
        logger.info(f"Found {len(files)} Excel files in {self.raw_dir}")
        return files
    
    def detect_file_type(self, file_path: Path) -> str:
        """
        Detect the type of Excel file (residual or merchant).
        
        Args:
            file_path: Path to the Excel file
            
        Returns:
            File type: "residual" or "merchant"
        """
        # Try to load the first few rows to analyze headers
        try:
            df = pd.read_excel(file_path, nrows=5)
            headers = [str(col).lower() for col in df.columns]
            
            # Check for residual indicators
            residual_indicators = ['residual', 'commission', 'bps', 'basis point', 'agent', 'split']
            if any(indicator in " ".join(headers) for indicator in residual_indicators):
                return "residual"
            
            # Check for merchant indicators
            merchant_indicators = ['merchant', 'volume', 'transaction', 'mid', 'dba']
            if any(indicator in " ".join(headers) for indicator in merchant_indicators):
                return "merchant"
            
            # Default to residual if we can't determine
            logger.warning(f"Could not definitively determine file type for {file_path.name}, defaulting to residual")
            return "residual"
            
        except Exception as e:
            logger.error(f"Error detecting file type for {file_path.name}: {str(e)}")
            raise
    
    def extract_date_from_filename(self, file_path: Path) -> str:
        """
        Extract date from filename (e.g., "residuals_2023-01.xlsx" -> "2023-01").
        
        Args:
            file_path: Path to the Excel file
            
        Returns:
            Date string in format YYYY-MM
        """
        filename = file_path.stem
        
        # Try to find a date pattern in the filename
        import re
        date_patterns = [
            r'(\d{4}-\d{2})',  # YYYY-MM
            r'(\d{4}_\d{2})',  # YYYY_MM
            r'(\d{2}-\d{4})',  # MM-YYYY
            r'(\d{2}_\d{4})',  # MM_YYYY
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, filename)
            if match:
                date_str = match.group(1)
                # Normalize to YYYY-MM
                if '-' in date_str:
                    parts = date_str.split('-')
                else:
                    parts = date_str.split('_')
                
                if len(parts[0]) == 2:  # MM-YYYY or MM_YYYY
                    return f"{parts[1]}-{parts[0]}"
                else:  # YYYY-MM or YYYY_MM
                    return f"{parts[0]}-{parts[1]}"
        
        # If no date found, use current month
        logger.warning(f"Could not extract date from filename {filename}, using current month")
        now = datetime.now()
        return f"{now.year}-{now.month:02d}"
    
    def load_excel_file(self, file_path: Path, sheet_name: Optional[Union[str, int]] = 0) -> pd.DataFrame:
        """
        Load an Excel file into a pandas DataFrame.
        
        Args:
            file_path: Path to the Excel file
            sheet_name: Sheet name or index (default: 0 for first sheet)
            
        Returns:
            DataFrame containing the Excel data
        """
        logger.info(f"Loading Excel file: {file_path}")
        
        try:
            # First try with default parameters
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Check if we got a usable DataFrame
            if df.empty:
                logger.warning(f"Empty DataFrame from {file_path}, trying with header=None")
                df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
            
            # Check for unnamed columns which might indicate header issues
            unnamed_cols = sum(1 for col in df.columns if 'unnamed' in str(col).lower())
            if unnamed_cols > len(df.columns) / 2:
                logger.warning(f"Many unnamed columns in {file_path}, trying with header=1")
                df = pd.read_excel(file_path, sheet_name=sheet_name, header=1)
            
            logger.info(f"Successfully loaded {len(df)} rows from {file_path}")
            return df
            
        except Exception as e:
            logger.error(f"Error loading {file_path}: {str(e)}")
            raise
    
    def load_all_excel_files(self) -> Dict[str, Dict[str, pd.DataFrame]]:
        """
        Load all Excel files from the raw data directory.
        
        Returns:
            Dictionary with file types as keys and dictionaries of date -> DataFrame as values
        """
        files = self.list_excel_files()
        result = {
            "residual": {},
            "merchant": {}
        }
        
        for file_path in files:
            try:
                file_type = self.detect_file_type(file_path)
                date_str = self.extract_date_from_filename(file_path)
                df = self.load_excel_file(file_path)
                
                result[file_type][date_str] = df
                logger.info(f"Loaded {file_type} file for {date_str}: {file_path.name}")
                
            except Exception as e:
                logger.error(f"Error processing {file_path.name}: {str(e)}")
                # Continue with next file
        
        return result
    
    def load_specific_file(self, file_path: Path) -> Dict[str, Any]:
        """
        Load a specific Excel file and return its data with metadata.
        
        Args:
            file_path: Path to the Excel file
            
        Returns:
            Dictionary with file data and metadata
        """
        file_type = self.detect_file_type(file_path)
        date_str = self.extract_date_from_filename(file_path)
        df = self.load_excel_file(file_path)
        
        return {
            "type": file_type,
            "date": date_str,
            "data": df,
            "file_name": file_path.name,
            "row_count": len(df)
        }
