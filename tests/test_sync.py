"""
Unit tests for the Data Synchronizer module.
"""
import os
import sys
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.db.sync import DataSynchronizer

class TestDataSynchronizer:
    """Test cases for the DataSynchronizer class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock the Supabase client
        self.mock_supabase_client = MagicMock()
        
        # Create a DataSynchronizer with the mock client
        self.synchronizer = DataSynchronizer(self.mock_supabase_client)
        
        # Sample merchant DataFrame
        self.merchant_df = pd.DataFrame({
            'mid': ['123456', '789012'],
            'merchant_dba': ['Merchant 1', 'Merchant 2'],
            'total_volume': [1000.0, 2000.0],
            'total_txns': [10, 20],
            'month': ['2023-05', '2023-05']
        })
        
        # Sample residual DataFrame
        self.residual_df = pd.DataFrame({
            'mid': ['123456', '789012'],
            'net_profit': [50.0, 100.0],
            'residual': [25.0, 50.0],
            'month': ['2023-05', '2023-05']
        })
        
        # Sample agent DataFrame
        self.agent_df = pd.DataFrame({
            'agent_name': ['Agent 1', 'Agent 2'],
            'total_earnings': [500.0, 1000.0],
            'merchant_count': [5, 10],
            'month': ['2023-05', '2023-05']
        })
    
    def test_sync_merchant_data(self):
        """Test syncing merchant data."""
        # Set up mock responses
        self.mock_supabase_client.check_merchant_exists.side_effect = [True, False]
        self.mock_supabase_client.upsert_merchant.return_value = True
        self.mock_supabase_client.insert_merchant.return_value = True
        
        # Call the method
        result = self.synchronizer.sync_merchant_data(self.merchant_df)
        
        # Verify the results
        assert result['total'] == 2
        assert result['upserted'] == 1
        assert result['inserted'] == 1
        assert result['failed'] == 0
        
        # Verify the mock calls
        assert self.mock_supabase_client.check_merchant_exists.call_count == 2
        assert self.mock_supabase_client.upsert_merchant.call_count == 1
        assert self.mock_supabase_client.insert_merchant.call_count == 1
    
    def test_sync_merchant_data_with_failure(self):
        """Test syncing merchant data with failure."""
        # Set up mock responses
        self.mock_supabase_client.check_merchant_exists.side_effect = [True, False]
        self.mock_supabase_client.upsert_merchant.return_value = False  # Failure
        self.mock_supabase_client.insert_merchant.return_value = True
        
        # Call the method
        result = self.synchronizer.sync_merchant_data(self.merchant_df)
        
        # Verify the results
        assert result['total'] == 2
        assert result['upserted'] == 0
        assert result['inserted'] == 1
        assert result['failed'] == 1
    
    def test_sync_residual_data(self):
        """Test syncing residual data."""
        # Set up mock responses
        self.mock_supabase_client.check_residual_exists.side_effect = [True, False]
        self.mock_supabase_client.upsert_residual.return_value = True
        self.mock_supabase_client.insert_residual.return_value = True
        
        # Call the method
        result = self.synchronizer.sync_residual_data(self.residual_df)
        
        # Verify the results
        assert result['total'] == 2
        assert result['upserted'] == 1
        assert result['inserted'] == 1
        assert result['failed'] == 0
        
        # Verify the mock calls
        assert self.mock_supabase_client.check_residual_exists.call_count == 2
        assert self.mock_supabase_client.upsert_residual.call_count == 1
        assert self.mock_supabase_client.insert_residual.call_count == 1
    
    def test_sync_residual_data_with_failure(self):
        """Test syncing residual data with failure."""
        # Set up mock responses
        self.mock_supabase_client.check_residual_exists.side_effect = [True, False]
        self.mock_supabase_client.upsert_residual.return_value = True
        self.mock_supabase_client.insert_residual.return_value = False  # Failure
        
        # Call the method
        result = self.synchronizer.sync_residual_data(self.residual_df)
        
        # Verify the results
        assert result['total'] == 2
        assert result['upserted'] == 1
        assert result['inserted'] == 0
        assert result['failed'] == 1
    
    def test_sync_agent_data(self):
        """Test syncing agent data."""
        # Set up mock responses
        self.mock_supabase_client.check_agent_exists.side_effect = [True, False]
        self.mock_supabase_client.upsert_agent_data.return_value = True
        self.mock_supabase_client.insert_agent_data.return_value = True
        
        # Call the method
        result = self.synchronizer.sync_agent_data(self.agent_df)
        
        # Verify the results
        assert result['total'] == 2
        assert result['upserted'] == 1
        assert result['inserted'] == 1
        assert result['failed'] == 0
    
    def test_sync_all_data(self):
        """Test syncing all data."""
        # Set up mock responses for merchant sync
        self.mock_supabase_client.check_merchant_exists.side_effect = [True, False]
        self.mock_supabase_client.upsert_merchant.return_value = True
        self.mock_supabase_client.insert_merchant.return_value = True
        
        # Set up mock responses for residual sync
        self.mock_supabase_client.check_residual_exists.side_effect = [True, False]
        self.mock_supabase_client.upsert_residual.return_value = True
        self.mock_supabase_client.insert_residual.return_value = True
        
        # Call the method
        result = self.synchronizer.sync_all_data(self.merchant_df, self.residual_df)
        
        # Verify the results
        assert 'merchant' in result
        assert 'residual' in result
        assert result['merchant']['total'] == 2
        assert result['residual']['total'] == 2
    
    def test_prepare_merchant_record(self):
        """Test preparing a merchant record."""
        # Create a sample merchant Series
        merchant = pd.Series({
            'mid': '123456',
            'merchant_dba': 'Merchant 1',
            'total_volume': 1000.0,
            'total_txns': 10,
            'month': '2023-05'
        })
        
        # Call the method
        record = self.synchronizer._prepare_merchant_record(merchant)
        
        # Verify the results
        assert record['mid'] == '123456'
        assert record['merchant_dba'] == 'Merchant 1'
        assert record['total_volume'] == 1000.0
        assert record['total_txns'] == 10
        assert record['month'] == '2023-05'
        assert 'created_at' in record
        assert 'updated_at' in record
    
    def test_prepare_residual_record(self):
        """Test preparing a residual record."""
        # Create a sample residual Series
        residual = pd.Series({
            'mid': '123456',
            'net_profit': 50.0,
            'residual': 25.0,
            'month': '2023-05'
        })
        
        # Call the method
        record = self.synchronizer._prepare_residual_record(residual)
        
        # Verify the results
        assert record['mid'] == '123456'
        assert record['net_profit'] == 50.0
        assert record['residual'] == 25.0
        assert record['month'] == '2023-05'
        assert 'created_at' in record
        assert 'updated_at' in record
    
    def test_prepare_agent_record(self):
        """Test preparing an agent record."""
        # Create a sample agent Series
        agent = pd.Series({
            'agent_name': 'Agent 1',
            'total_earnings': 500.0,
            'merchant_count': 5,
            'month': '2023-05'
        })
        
        # Call the method
        record = self.synchronizer._prepare_agent_record(agent)
        
        # Verify the results
        assert record['agent_name'] == 'Agent 1'
        assert record['total_earnings'] == 500.0
        assert record['merchant_count'] == 5
        assert record['month'] == '2023-05'
        assert 'created_at' in record
        assert 'updated_at' in record
