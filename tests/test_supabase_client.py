"""
Unit tests for the Supabase Client module.
"""
import os
import sys
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.db.supabase_client import SupabaseClient

class TestSupabaseClient:
    """Test cases for the SupabaseClient class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock the Supabase client
        self.mock_supabase = MagicMock()
        
        # Create a patched SupabaseClient
        with patch('irelandpay_analytics.db.supabase_client.create_client') as mock_create_client:
            mock_create_client.return_value = self.mock_supabase
            self.client = SupabaseClient()
    
    def test_init(self):
        """Test initialization."""
        # Verify that the client was created
        assert self.client.supabase is not None
    
    def test_insert_merchant(self):
        """Test inserting a merchant."""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.data = [{'id': 1, 'mid': '123456'}]
        mock_response.error = None
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.insert.return_value = mock_response
        
        # Call the method
        result = self.client.insert_merchant({
            'mid': '123456',
            'merchant_dba': 'Test Merchant',
            'total_volume': 1000.0
        })
        
        # Verify the results
        assert result is True
        self.mock_supabase.table.assert_called_with('merchant_data')
        self.mock_supabase.table().insert.assert_called_once()
    
    def test_insert_merchant_error(self):
        """Test inserting a merchant with error."""
        # Set up mock response with error
        mock_response = MagicMock()
        mock_response.data = None
        mock_response.error = {'message': 'Test error'}
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.insert.return_value = mock_response
        
        # Call the method
        result = self.client.insert_merchant({
            'mid': '123456',
            'merchant_dba': 'Test Merchant',
            'total_volume': 1000.0
        })
        
        # Verify the results
        assert result is False
    
    def test_upsert_merchant(self):
        """Test upserting a merchant."""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.data = [{'id': 1, 'mid': '123456'}]
        mock_response.error = None
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.upsert.return_value = mock_response
        
        # Call the method
        result = self.client.upsert_merchant({
            'mid': '123456',
            'merchant_dba': 'Test Merchant',
            'total_volume': 1000.0
        })
        
        # Verify the results
        assert result is True
        self.mock_supabase.table.assert_called_with('merchant_data')
        self.mock_supabase.table().upsert.assert_called_once()
    
    def test_upsert_merchant_error(self):
        """Test upserting a merchant with error."""
        # Set up mock response with error
        mock_response = MagicMock()
        mock_response.data = None
        mock_response.error = {'message': 'Test error'}
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.upsert.return_value = mock_response
        
        # Call the method
        result = self.client.upsert_merchant({
            'mid': '123456',
            'merchant_dba': 'Test Merchant',
            'total_volume': 1000.0
        })
        
        # Verify the results
        assert result is False
    
    def test_insert_residual(self):
        """Test inserting a residual."""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.data = [{'id': 1, 'mid': '123456'}]
        mock_response.error = None
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.insert.return_value = mock_response
        
        # Call the method
        result = self.client.insert_residual({
            'mid': '123456',
            'net_profit': 50.0,
            'month': '2023-05'
        })
        
        # Verify the results
        assert result is True
        self.mock_supabase.table.assert_called_with('residual_data')
        self.mock_supabase.table().insert.assert_called_once()
    
    def test_upsert_residual(self):
        """Test upserting a residual."""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.data = [{'id': 1, 'mid': '123456'}]
        mock_response.error = None
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.upsert.return_value = mock_response
        
        # Call the method
        result = self.client.upsert_residual({
            'mid': '123456',
            'net_profit': 50.0,
            'month': '2023-05'
        })
        
        # Verify the results
        assert result is True
        self.mock_supabase.table.assert_called_with('residual_data')
        self.mock_supabase.table().upsert.assert_called_once()
    
    def test_insert_agent_data(self):
        """Test inserting agent data."""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.data = [{'id': 1, 'agent_name': 'Agent 1'}]
        mock_response.error = None
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.insert.return_value = mock_response
        
        # Call the method
        result = self.client.insert_agent_data({
            'agent_name': 'Agent 1',
            'total_earnings': 1000.0,
            'month': '2023-05'
        })
        
        # Verify the results
        assert result is True
        self.mock_supabase.table.assert_called_with('agent_data')
        self.mock_supabase.table().insert.assert_called_once()
    
    def test_upsert_agent_data(self):
        """Test upserting agent data."""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.data = [{'id': 1, 'agent_name': 'Agent 1'}]
        mock_response.error = None
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.upsert.return_value = mock_response
        
        # Call the method
        result = self.client.upsert_agent_data({
            'agent_name': 'Agent 1',
            'total_earnings': 1000.0,
            'month': '2023-05'
        })
        
        # Verify the results
        assert result is True
        self.mock_supabase.table.assert_called_with('agent_data')
        self.mock_supabase.table().upsert.assert_called_once()
    
    def test_check_merchant_exists(self):
        """Test checking if a merchant exists."""
        # Set up mock response for existing merchant
        mock_response_exists = MagicMock()
        mock_response_exists.data = [{'id': 1, 'mid': '123456'}]
        mock_response_exists.error = None
        
        # Set up mock response for non-existing merchant
        mock_response_not_exists = MagicMock()
        mock_response_not_exists.data = []
        mock_response_not_exists.error = None
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            mock_response_exists,
            mock_response_not_exists
        ]
        
        # Call the method for existing merchant
        result_exists = self.client.check_merchant_exists('123456')
        
        # Call the method for non-existing merchant
        result_not_exists = self.client.check_merchant_exists('789012')
        
        # Verify the results
        assert result_exists is True
        assert result_not_exists is False
        self.mock_supabase.table.assert_called_with('merchant_data')
    
    def test_check_residual_exists(self):
        """Test checking if a residual exists."""
        # Set up mock response for existing residual
        mock_response_exists = MagicMock()
        mock_response_exists.data = [{'id': 1, 'mid': '123456', 'month': '2023-05'}]
        mock_response_exists.error = None
        
        # Set up mock response for non-existing residual
        mock_response_not_exists = MagicMock()
        mock_response_not_exists.data = []
        mock_response_not_exists.error = None
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_response_exists,
            mock_response_not_exists
        ]
        
        # Call the method for existing residual
        result_exists = self.client.check_residual_exists('123456', '2023-05')
        
        # Call the method for non-existing residual
        result_not_exists = self.client.check_residual_exists('789012', '2023-05')
        
        # Verify the results
        assert result_exists is True
        assert result_not_exists is False
        self.mock_supabase.table.assert_called_with('residual_data')
    
    def test_get_merchant_data(self):
        """Test getting merchant data."""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.data = [
            {'id': 1, 'mid': '123456', 'merchant_dba': 'Merchant 1'},
            {'id': 2, 'mid': '789012', 'merchant_dba': 'Merchant 2'}
        ]
        mock_response.error = None
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.select.return_value.execute.return_value = mock_response
        
        # Call the method
        result = self.client.get_merchant_data()
        
        # Verify the results
        assert len(result) == 2
        assert result[0]['mid'] == '123456'
        assert result[1]['mid'] == '789012'
        self.mock_supabase.table.assert_called_with('merchant_data')
    
    def test_get_residual_data(self):
        """Test getting residual data."""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.data = [
            {'id': 1, 'mid': '123456', 'net_profit': 50.0, 'month': '2023-05'},
            {'id': 2, 'mid': '789012', 'net_profit': 100.0, 'month': '2023-05'}
        ]
        mock_response.error = None
        
        # Set up the mock chain
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        # Call the method
        result = self.client.get_residual_data('2023-05')
        
        # Verify the results
        assert len(result) == 2
        assert result[0]['mid'] == '123456'
        assert result[1]['mid'] == '789012'
        self.mock_supabase.table.assert_called_with('residual_data')
