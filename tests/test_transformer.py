"""
Unit tests for the Transformer module.
"""
import os
import sys
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.ingest.transformer import Transformer

class TestTransformer:
    """Test cases for the Transformer class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.transformer = Transformer()
        
        # Sample merchant data
        self.merchant_df = pd.DataFrame({
            'MID': ['123456', '789012'],
            'DBA Name': ['Merchant 1', 'Merchant 2'],
            'Volume': [1000.0, 2000.0],
            'Transactions': [10, 20],
            'Agent': ['Agent 1', 'Agent 2']
        })
        
        # Sample residual data
        self.residual_df = pd.DataFrame({
            'MID': ['123456', '789012'],
            'Net Profit': [50.0, 100.0],
            'Residual': [25.0, 50.0],
            'Agent': ['Agent 1', 'Agent 2']
        })
    
    def test_normalize_column_names_merchant(self):
        """Test normalizing merchant column names."""
        # Create a DataFrame with various column name formats
        df = pd.DataFrame({
            'MID': ['123456'],
            'DBA Name': ['Merchant 1'],
            'VOLUME': [1000.0],
            'Number of Transactions': [10],
            'AGENT NAME': ['Agent 1']
        })
        
        # Call the method
        normalized_df = self.transformer.normalize_column_names(df, 'merchant')
        
        # Verify the results
        assert 'mid' in normalized_df.columns
        assert 'merchant_dba' in normalized_df.columns
        assert 'total_volume' in normalized_df.columns
        assert 'total_txns' in normalized_df.columns
        assert 'agent_name' in normalized_df.columns
    
    def test_normalize_column_names_residual(self):
        """Test normalizing residual column names."""
        # Create a DataFrame with various column name formats
        df = pd.DataFrame({
            'MID': ['123456'],
            'NET PROFIT': [50.0],
            'Residual Amount': [25.0],
            'Agent': ['Agent 1']
        })
        
        # Call the method
        normalized_df = self.transformer.normalize_column_names(df, 'residual')
        
        # Verify the results
        assert 'mid' in normalized_df.columns
        assert 'net_profit' in normalized_df.columns
        assert 'residual' in normalized_df.columns
        assert 'agent_name' in normalized_df.columns
    
    def test_clean_merchant_data(self):
        """Test cleaning merchant data."""
        # Create a DataFrame with data that needs cleaning
        df = pd.DataFrame({
            'MID': ['123456', '789012', np.nan],
            'DBA Name': ['Merchant 1', 'Merchant 2', 'Merchant 3'],
            'Volume': ['1,000.00', '2,000.00', 'N/A'],
            'Transactions': ['10', '20', ''],
            'Agent': ['Agent 1', 'Agent 2', None]
        })
        
        # Call the method
        cleaned_df = self.transformer.clean_merchant_data(df)
        
        # Verify the results
        assert len(cleaned_df) == 2  # Row with NaN MID should be removed
        assert cleaned_df['total_volume'].dtype == float
        assert cleaned_df['total_txns'].dtype == int
        assert cleaned_df.iloc[0]['total_volume'] == 1000.0
        assert cleaned_df.iloc[1]['total_txns'] == 20
    
    def test_clean_residual_data(self):
        """Test cleaning residual data."""
        # Create a DataFrame with data that needs cleaning
        df = pd.DataFrame({
            'MID': ['123456', '789012', np.nan],
            'Net Profit': ['$50.00', '$100.00', 'N/A'],
            'Residual': ['25.00', '50.00', ''],
            'Agent': ['Agent 1', 'Agent 2', None]
        })
        
        # Call the method
        cleaned_df = self.transformer.clean_residual_data(df)
        
        # Verify the results
        assert len(cleaned_df) == 2  # Row with NaN MID should be removed
        assert cleaned_df['net_profit'].dtype == float
        assert cleaned_df['residual'].dtype == float
        assert cleaned_df.iloc[0]['net_profit'] == 50.0
        assert cleaned_df.iloc[1]['residual'] == 50.0
    
    def test_merge_merchant_and_residual(self):
        """Test merging merchant and residual data."""
        # Call the method
        merged_df = self.transformer.merge_merchant_and_residual(self.merchant_df, self.residual_df)
        
        # Verify the results
        assert len(merged_df) == 2  # Both rows should match
        assert 'mid' in merged_df.columns
        assert 'merchant_dba' in merged_df.columns
        assert 'total_volume' in merged_df.columns
        assert 'total_txns' in merged_df.columns
        assert 'net_profit' in merged_df.columns
        assert 'residual' in merged_df.columns
        assert 'agent_name' in merged_df.columns
        
        # Check that profit margin is calculated correctly
        assert 'profit_margin' in merged_df.columns
        assert merged_df.iloc[0]['profit_margin'] == 5.0  # (50/1000) * 100
        assert merged_df.iloc[1]['profit_margin'] == 5.0  # (100/2000) * 100
    
    def test_merge_with_missing_data(self):
        """Test merging with missing data."""
        # Create DataFrames with mismatched MIDs
        merchant_df = pd.DataFrame({
            'MID': ['123456', '789012', '345678'],
            'DBA Name': ['Merchant 1', 'Merchant 2', 'Merchant 3'],
            'Volume': [1000.0, 2000.0, 3000.0]
        })
        
        residual_df = pd.DataFrame({
            'MID': ['123456', '789012', '901234'],
            'Net Profit': [50.0, 100.0, 150.0]
        })
        
        # Call the method
        merged_df = self.transformer.merge_merchant_and_residual(merchant_df, residual_df)
        
        # Verify the results
        assert len(merged_df) == 2  # Only matching MIDs should be included
        assert set(merged_df['mid']) == {'123456', '789012'}
    
    def test_calculate_profit_margin(self):
        """Test calculating profit margin."""
        # Create a DataFrame with volume and profit
        df = pd.DataFrame({
            'total_volume': [1000.0, 2000.0, 0.0],
            'net_profit': [50.0, 100.0, 25.0]
        })
        
        # Call the method
        result_df = self.transformer.calculate_profit_margin(df)
        
        # Verify the results
        assert 'profit_margin' in result_df.columns
        assert result_df.iloc[0]['profit_margin'] == 5.0  # (50/1000) * 100
        assert result_df.iloc[1]['profit_margin'] == 5.0  # (100/2000) * 100
        assert result_df.iloc[2]['profit_margin'] == 0.0  # Division by zero should be handled
