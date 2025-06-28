"""
Unit tests for the DataTransformer module.
"""
import os
import sys
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock
from datetime import datetime

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.ingest.transformer import DataTransformer

class TestDataTransformer:
    """Test cases for the DataTransformer class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.transformer = DataTransformer()
        
        # Sample merchant data with various column formats
        self.merchant_df = pd.DataFrame({
            'merchant id': ['123456', '789012'],
            'dba name': ['Merchant 1', 'Merchant 2'],
            'volume': [1000.0, 2000.0],
            'transactions': [10, 20],
            'month': ['2023-05', '2023-05']
        })
        
        # Sample residual data with various column formats
        self.residual_df = pd.DataFrame({
            'merchant id': ['123456', '789012'],
            'net profit': [50.0, 100.0],
            'month': ['2023-05', '2023-05']
        })
    
    def test_merchant_column_mappings(self):
        """Test that merchant column mappings are correctly defined."""
        # Verify the mappings are correctly defined
        assert 'merchant id' in self.transformer.MERCHANT_COLUMN_MAPPINGS
        assert self.transformer.MERCHANT_COLUMN_MAPPINGS['merchant id'] == 'mid'
        assert self.transformer.MERCHANT_COLUMN_MAPPINGS['dba name'] == 'merchant_dba'
        assert self.transformer.MERCHANT_COLUMN_MAPPINGS['volume'] == 'total_volume'
        assert self.transformer.MERCHANT_COLUMN_MAPPINGS['transactions'] == 'total_txns'
    
    def test_residual_column_mappings(self):
        """Test that residual column mappings are correctly defined."""
        # Verify the mappings are correctly defined
        assert 'merchant id' in self.transformer.RESIDUAL_COLUMN_MAPPINGS
        assert self.transformer.RESIDUAL_COLUMN_MAPPINGS['merchant id'] == 'mid'
        assert self.transformer.RESIDUAL_COLUMN_MAPPINGS['net profit'] == 'net_profit'
    
    def test_normalize_merchant_data(self):
        """Test normalizing merchant data."""
        # Call the method
        normalized_df = self.transformer.normalize_column_names(self.merchant_df, 'merchant')
        
        # Verify the results
        assert 'mid' in normalized_df.columns
        assert 'merchant_dba' in normalized_df.columns
        assert 'total_volume' in normalized_df.columns
        assert 'total_txns' in normalized_df.columns
        assert 'month' in normalized_df.columns
        
        # Check that values are preserved
        assert normalized_df.iloc[0]['mid'] == '123456'
        assert normalized_df.iloc[0]['merchant_dba'] == 'Merchant 1'
        assert normalized_df.iloc[0]['total_volume'] == 1000.0
        assert normalized_df.iloc[0]['total_txns'] == 10
    
    def test_normalize_residual_data(self):
        """Test normalizing residual data."""
        # Call the method
        normalized_df = self.transformer.normalize_column_names(self.residual_df, 'residual')
        
        # Verify the results
        assert 'mid' in normalized_df.columns
        assert 'net_profit' in normalized_df.columns
        assert 'month' in normalized_df.columns
        
        # Check that values are preserved
        assert normalized_df.iloc[0]['mid'] == '123456'
        assert normalized_df.iloc[0]['net_profit'] == 50.0
    
    def test_normalize_merchant_data_with_unusual_columns(self):
        """Test normalizing merchant data with unusual column names."""
        # Create a DataFrame with unusual column names
        df = pd.DataFrame({
            'MERCHANT #': ['123456', '789012'],
            'BUSINESS NAME': ['Merchant 1', 'Merchant 2'],
            'PROCESSING VOLUME': [1000.0, 2000.0],
            'TXN COUNT': [10, 20],
            'month': ['2023-05', '2023-05']
        })
        
        # Call the method
        normalized_df = self.transformer.normalize_column_names(df, 'merchant')
        
        # Verify the results
        assert 'mid' in normalized_df.columns
        assert 'merchant_dba' in normalized_df.columns
        assert 'total_volume' in normalized_df.columns
        assert 'total_txns' in normalized_df.columns
        
        # Check that values are preserved
        assert normalized_df.iloc[0]['mid'] == '123456'
        assert normalized_df.iloc[0]['merchant_dba'] == 'Merchant 1'
        assert normalized_df.iloc[0]['total_volume'] == 1000.0
        assert normalized_df.iloc[0]['total_txns'] == 10
    
    def test_normalize_residual_data_with_unusual_columns(self):
        """Test normalizing residual data with unusual column names."""
        # Create a DataFrame with unusual column names
        df = pd.DataFrame({
            'MERCHANT NO.': ['123456', '789012'],
            'RESIDUAL': [50.0, 100.0],
            'month': ['2023-05', '2023-05']
        })
        
        # Call the method
        normalized_df = self.transformer.normalize_column_names(df, 'residual')
        
        # Verify the results
        assert 'mid' in normalized_df.columns
        assert 'net_profit' in normalized_df.columns
        
        # Check that values are preserved
        assert normalized_df.iloc[0]['mid'] == '123456'
        assert normalized_df.iloc[0]['net_profit'] == 50.0
    
    def test_merge_datasets(self):
        """Test merging merchant and residual datasets."""
        # Clean the data first
        month = '2023-05'
        merchant_df = self.transformer.clean_merchant_data(self.transformer.normalize_column_names(self.merchant_df, 'merchant'), month)
        residual_df = self.transformer.clean_residual_data(self.transformer.normalize_column_names(self.residual_df, 'residual'), month)
        
        # Call the method
        merged_df = self.transformer.merge_merchant_residual_data(merchant_df, residual_df)
        
        # Verify the results
        assert len(merged_df) == 2  # Both rows should match
        assert 'mid' in merged_df.columns
        assert 'merchant_dba' in merged_df.columns
        assert 'total_volume' in merged_df.columns
        assert 'total_txns' in merged_df.columns
        assert 'net_profit' in merged_df.columns
        
        # Check that values are preserved
        assert merged_df.iloc[0]['mid'] == '123456'
        assert merged_df.iloc[0]['merchant_dba'] == 'Merchant 1'
        assert merged_df.iloc[0]['total_volume'] == 1000.0
        assert merged_df.iloc[0]['net_profit'] == 50.0
    
    def test_merge_datasets_with_missing_data(self):
        """Test merging datasets with missing data."""
        # Create DataFrames with mismatched MIDs
        month = '2023-05'
        merchant_df = pd.DataFrame({
            'mid': ['123456', '789012', '345678'],
            'merchant_dba': ['Merchant 1', 'Merchant 2', 'Merchant 3'],
            'total_volume': [1000.0, 2000.0, 3000.0],
            'total_txns': [10, 20, 30],
            'payout_month': [month, month, month],
            'created_at': [datetime.now().isoformat()] * 3,
            'id': ['123456_2023-05', '789012_2023-05', '345678_2023-05']
        })
        
        residual_df = pd.DataFrame({
            'mid': ['123456', '789012', '901234'],
            'net_profit': [50.0, 100.0, 150.0],
            'payout_month': [month, month, month],
            'created_at': [datetime.now().isoformat()] * 3,
            'id': ['123456_2023-05', '789012_2023-05', '901234_2023-05']
        })
        
        # Call the method
        merged_df = self.transformer.merge_merchant_residual_data(merchant_df, residual_df)
        
        # Verify the results
        assert len(merged_df) >= 3  # Should include all MIDs (outer join)
        # Check that the matching MIDs have both merchant and residual data
        matching_rows = merged_df[merged_df['mid'].isin(['123456', '789012'])]
        assert len(matching_rows) == 2
        assert all(matching_rows['total_volume'] > 0)
        assert all(matching_rows['net_profit'] > 0)
    
    def test_transform_data(self):
        """Test transforming data based on file type."""
        # Test merchant data transformation
        merchant_result = self.transformer.transform_data(self.merchant_df, 'merchant', '2023-05')
        
        # Verify merchant results
        assert 'mid' in merchant_result.columns
        assert 'merchant_dba' in merchant_result.columns
        assert 'total_volume' in merchant_result.columns
        assert 'total_txns' in merchant_result.columns
        assert 'payout_month' in merchant_result.columns
        assert merchant_result.iloc[0]['payout_month'] == '2023-05'
        
        # Test residual data transformation
        residual_result = self.transformer.transform_data(self.residual_df, 'residual', '2023-05')
        
        # Verify residual results
        assert 'mid' in residual_result.columns
        assert 'net_profit' in residual_result.columns
        assert 'payout_month' in residual_result.columns
        assert residual_result.iloc[0]['payout_month'] == '2023-05'
    
    def test_clean_merchant_data(self):
        """Test cleaning merchant data."""
        # Create a DataFrame with data that needs cleaning
        df = pd.DataFrame({
            'mid': ['123456', '789012', np.nan],
            'merchant_dba': ['Merchant 1', 'Merchant 2', 'Merchant 3'],
            'total_volume': ['1,000.00', '2,000.00', 'N/A'],
            'total_txns': ['10', '20', ''],
            'agent_name': ['Agent 1', 'Agent 2', None]
        })
        
        # Call the method
        cleaned_df = self.transformer.clean_merchant_data(df, '2023-05')
        
        # Verify the results
        assert len(cleaned_df) == 2  # Row with NaN MID should be removed
        assert 'payout_month' in cleaned_df.columns
        assert cleaned_df.iloc[0]['payout_month'] == '2023-05'
        assert 'id' in cleaned_df.columns
        assert cleaned_df.iloc[0]['id'] == '123456_2023-05'
    
    def test_clean_residual_data(self):
        """Test cleaning residual data."""
        # Create a DataFrame with data that needs cleaning
        df = pd.DataFrame({
            'mid': ['123456', '789012', np.nan],
            'net_profit': ['$50.00', '$100.00', 'N/A']
        })
        
        # Call the method
        cleaned_df = self.transformer.clean_residual_data(df, '2023-05')
        
        # Verify the results
        assert len(cleaned_df) == 2  # Row with NaN MID should be removed
        assert 'payout_month' in cleaned_df.columns
        assert cleaned_df.iloc[0]['payout_month'] == '2023-05'
        assert 'id' in cleaned_df.columns
        assert cleaned_df.iloc[0]['id'] == '123456_2023-05'
