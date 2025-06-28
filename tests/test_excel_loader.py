"""
Unit tests for the Excel Loader module.
"""
import os
import sys
import pytest
from pathlib import Path
import pandas as pd
from unittest.mock import patch, mock_open, MagicMock

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.ingest.excel_loader import ExcelLoader
from irelandpay_analytics.config import settings

class TestExcelLoader:
    """Test cases for the ExcelLoader class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.loader = ExcelLoader()
        
        # Create a temporary test directory structure
        self.test_dir = Path("test_data")
        self.test_dir.mkdir(exist_ok=True)
        
        # Sample file paths
        self.merchant_file = self.test_dir / "merchant_data_2023-05.xlsx"
        self.residual_file = self.test_dir / "residual_report_2023-05.xlsx"
    
    def teardown_method(self):
        """Tear down test fixtures."""
        # Clean up test files
        for file in [self.merchant_file, self.residual_file]:
            if file.exists():
                file.unlink()
        
        # Remove test directory
        if self.test_dir.exists():
            self.test_dir.rmdir()
    
    def test_list_excel_files(self):
        """Test listing Excel files."""
        with patch('pathlib.Path.glob') as mock_glob:
            # Mock the glob method to return our test files
            mock_glob.return_value = [
                self.merchant_file,
                self.residual_file
            ]
            
            # Call the method
            files = self.loader.list_excel_files()
            
            # Verify the results
            assert len(files) == 2
            assert self.merchant_file in files
            assert self.residual_file in files
    
    def test_extract_date_from_filename(self):
        """Test extracting date from filename."""
        # Test with merchant file format
        assert self.loader.extract_date_from_filename(self.merchant_file) == "2023-05"
        
        # Test with residual file format
        assert self.loader.extract_date_from_filename(self.residual_file) == "2023-05"
        
        # Test with invalid filename
        invalid_file = Path("invalid_file.xlsx")
        assert self.loader.extract_date_from_filename(invalid_file) is None
    
    def test_detect_file_type_merchant(self):
        """Test detecting merchant file type."""
        with patch('pandas.read_excel') as mock_read_excel:
            # Mock a merchant file DataFrame
            mock_df = pd.DataFrame({
                'MID': ['123456', '789012'],
                'DBA Name': ['Merchant 1', 'Merchant 2'],
                'Volume': [1000, 2000]
            })
            mock_read_excel.return_value = mock_df
            
            # Call the method
            file_type = self.loader.detect_file_type(self.merchant_file)
            
            # Verify the result
            assert file_type == 'merchant'
    
    def test_detect_file_type_residual(self):
        """Test detecting residual file type."""
        with patch('pandas.read_excel') as mock_read_excel:
            # Mock a residual file DataFrame
            mock_df = pd.DataFrame({
                'MID': ['123456', '789012'],
                'Residual': [100, 200],
                'Net Profit': [50, 100]
            })
            mock_read_excel.return_value = mock_df
            
            # Call the method
            file_type = self.loader.detect_file_type(self.residual_file)
            
            # Verify the result
            assert file_type == 'residual'
    
    def test_detect_file_type_unknown(self):
        """Test detecting unknown file type."""
        with patch('pandas.read_excel') as mock_read_excel:
            # Mock an unknown file DataFrame
            mock_df = pd.DataFrame({
                'Column1': ['Value1', 'Value2'],
                'Column2': ['Value3', 'Value4']
            })
            mock_read_excel.return_value = mock_df
            
            # Call the method
            file_type = self.loader.detect_file_type(self.merchant_file)
            
            # Verify the result
            assert file_type == 'unknown'
    
    def test_load_merchant_file(self):
        """Test loading merchant file."""
        with patch('pandas.read_excel') as mock_read_excel:
            # Mock a merchant file DataFrame
            mock_df = pd.DataFrame({
                'MID': ['123456', '789012'],
                'DBA Name': ['Merchant 1', 'Merchant 2'],
                'Volume': [1000, 2000]
            })
            mock_read_excel.return_value = mock_df
            
            # Call the method
            df = self.loader.load_merchant_file(self.merchant_file)
            
            # Verify the result
            assert df is not None
            assert len(df) == 2
            assert 'MID' in df.columns
            assert 'DBA Name' in df.columns
            assert 'Volume' in df.columns
    
    def test_load_residual_file(self):
        """Test loading residual file."""
        with patch('pandas.read_excel') as mock_read_excel:
            # Mock a residual file DataFrame
            mock_df = pd.DataFrame({
                'MID': ['123456', '789012'],
                'Residual': [100, 200],
                'Net Profit': [50, 100]
            })
            mock_read_excel.return_value = mock_df
            
            # Call the method
            df = self.loader.load_residual_file(self.residual_file)
            
            # Verify the result
            assert df is not None
            assert len(df) == 2
            assert 'MID' in df.columns
            assert 'Residual' in df.columns
            assert 'Net Profit' in df.columns
    
    def test_load_file_with_exception(self):
        """Test loading file with exception."""
        with patch('pandas.read_excel') as mock_read_excel:
            # Mock an exception
            mock_read_excel.side_effect = Exception("Test exception")
            
            # Call the method
            df = self.loader.load_merchant_file(self.merchant_file)
            
            # Verify the result
            assert df is None
