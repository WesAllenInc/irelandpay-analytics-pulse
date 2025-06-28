"""
Unit tests for the Dashboard Generator module.
"""
import os
import sys
import pytest
import json
import pandas as pd
from unittest.mock import patch, mock_open, MagicMock

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.reporting.dashboard_generator import DashboardGenerator

class TestDashboardGenerator:
    """Test cases for the DashboardGenerator class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.generator = DashboardGenerator()
        
        # Sample merchant data
        self.merchant_df = pd.DataFrame({
            'mid': ['123456', '789012', '345678'],
            'merchant_dba': ['Merchant 1', 'Merchant 2', 'Merchant 3'],
            'total_volume': [10000.0, 20000.0, 15000.0],
            'total_txns': [100, 200, 150],
            'net_profit': [500.0, 1000.0, 750.0],
            'profit_margin': [5.0, 5.0, 5.0],
            'agent_name': ['Agent 1', 'Agent 2', 'Agent 1'],
            'month': ['2023-05', '2023-05', '2023-05']
        })
        
        # Sample agent data
        self.agent_df = pd.DataFrame({
            'agent_name': ['Agent 1', 'Agent 2'],
            'total_earnings': [62.5, 60.0],
            'merchant_count': [2, 1],
            'total_volume': [25000.0, 20000.0],
            'avg_merchant_volume': [12500.0, 20000.0],
            'avg_merchant_earnings': [31.25, 60.0],
            'effective_bps': [25.0, 30.0],
            'month': ['2023-05', '2023-05']
        })
        
        # Sample historical data (3 months)
        self.historical_df = pd.DataFrame({
            'mid': ['123456', '123456', '123456', '789012', '789012', '789012'],
            'merchant_dba': ['Merchant 1', 'Merchant 1', 'Merchant 1', 'Merchant 2', 'Merchant 2', 'Merchant 2'],
            'total_volume': [9000.0, 9500.0, 10000.0, 18000.0, 19000.0, 20000.0],
            'month': ['2023-03', '2023-04', '2023-05', '2023-03', '2023-04', '2023-05']
        })
    
    def test_generate_merchant_dashboard(self):
        """Test generating merchant dashboard."""
        # Call the method
        result = self.generator.generate_merchant_dashboard(self.merchant_df, self.historical_df)
        
        # Verify the result
        assert result is not None
        assert isinstance(result, dict)
        
        # Check dashboard structure
        assert 'merchants' in result
        assert 'summary' in result
        assert 'month' in result
        
        # Check merchants data
        merchants = result['merchants']
        assert len(merchants) == 3
        
        # Check first merchant
        merchant1 = next(m for m in merchants if m['mid'] == '123456')
        assert merchant1['merchant_dba'] == 'Merchant 1'
        assert merchant1['total_volume'] == 10000.0
        assert merchant1['total_txns'] == 100
        assert merchant1['profit_margin'] == 5.0
        assert 'volume_trend' in merchant1
        assert len(merchant1['volume_trend']) == 3
        
        # Check summary
        summary = result['summary']
        assert summary['total_merchants'] == 3
        assert summary['total_volume'] == 45000.0
        assert summary['total_transactions'] == 450
        assert summary['avg_profit_margin'] == 5.0
    
    def test_generate_agent_dashboard(self):
        """Test generating agent dashboard."""
        # Call the method
        result = self.generator.generate_agent_dashboard(self.agent_df, self.merchant_df)
        
        # Verify the result
        assert result is not None
        assert isinstance(result, dict)
        
        # Check dashboard structure
        assert 'agents' in result
        assert 'summary' in result
        assert 'month' in result
        
        # Check agents data
        agents = result['agents']
        assert len(agents) == 2
        
        # Check first agent
        agent1 = next(a for a in agents if a['agent_name'] == 'Agent 1')
        assert agent1['merchant_count'] == 2
        assert agent1['total_volume'] == 25000.0
        assert agent1['total_earnings'] == 62.5
        assert agent1['effective_bps'] == 25.0
        assert 'merchants' in agent1
        assert len(agent1['merchants']) == 2
        
        # Check summary
        summary = result['summary']
        assert summary['total_agents'] == 2
        assert summary['total_merchants'] == 3
        assert summary['total_volume'] == 45000.0
        assert summary['total_earnings'] == 122.5
    
    def test_generate_volume_trends(self):
        """Test generating volume trends."""
        # Call the method for a specific merchant
        merchant_id = '123456'
        trends = self.generator.generate_volume_trends(merchant_id, self.historical_df)
        
        # Verify the result
        assert trends is not None
        assert len(trends) == 3
        
        # Check trend data
        assert trends[0]['month'] == '2023-03'
        assert trends[0]['volume'] == 9000.0
        assert trends[1]['month'] == '2023-04'
        assert trends[1]['volume'] == 9500.0
        assert trends[2]['month'] == '2023-05'
        assert trends[2]['volume'] == 10000.0
    
    def test_generate_volume_trends_with_missing_data(self):
        """Test generating volume trends with missing historical data."""
        # Call the method for a merchant not in historical data
        merchant_id = '999999'
        trends = self.generator.generate_volume_trends(merchant_id, self.historical_df)
        
        # Verify the result
        assert trends is not None
        assert len(trends) == 0
    
    def test_calculate_summary_metrics(self):
        """Test calculating summary metrics."""
        # Call the method
        summary = self.generator.calculate_summary_metrics(self.merchant_df)
        
        # Verify the result
        assert summary is not None
        assert summary['total_merchants'] == 3
        assert summary['total_volume'] == 45000.0
        assert summary['total_transactions'] == 450
        assert summary['avg_profit_margin'] == 5.0
    
    def test_calculate_summary_metrics_with_empty_data(self):
        """Test calculating summary metrics with empty data."""
        # Call the method with empty DataFrame
        summary = self.generator.calculate_summary_metrics(pd.DataFrame())
        
        # Verify the result
        assert summary is not None
        assert summary['total_merchants'] == 0
        assert summary['total_volume'] == 0.0
        assert summary['total_transactions'] == 0
        assert summary['avg_profit_margin'] == 0.0
    
    @patch('builtins.open', new_callable=mock_open)
    @patch('json.dump')
    def test_save_dashboard_to_file(self, mock_json_dump, mock_file_open):
        """Test saving dashboard to file."""
        # Sample dashboard data
        dashboard = {
            'merchants': [{'mid': '123456', 'merchant_dba': 'Merchant 1'}],
            'summary': {'total_merchants': 1},
            'month': '2023-05'
        }
        
        # Call the method
        self.generator.save_dashboard_to_file(dashboard, 'merchant', '2023-05')
        
        # Verify file was opened correctly
        mock_file_open.assert_called_once()
        
        # Verify json.dump was called with the dashboard data
        mock_json_dump.assert_called_once()
        args, _ = mock_json_dump.call_args
        assert args[0] == dashboard
    
    @patch('os.makedirs')
    @patch('builtins.open', new_callable=mock_open)
    @patch('json.dump')
    def test_save_dashboard_creates_directory(self, mock_json_dump, mock_file_open, mock_makedirs):
        """Test that save_dashboard_to_file creates directory if it doesn't exist."""
        # Sample dashboard data
        dashboard = {
            'agents': [{'agent_name': 'Agent 1'}],
            'summary': {'total_agents': 1},
            'month': '2023-05'
        }
        
        # Call the method
        self.generator.save_dashboard_to_file(dashboard, 'agent', '2023-05')
        
        # Verify directory was created
        mock_makedirs.assert_called_once()
        
        # Verify file was opened correctly
        mock_file_open.assert_called_once()
        
        # Verify json.dump was called with the dashboard data
        mock_json_dump.assert_called_once()
    
    @patch('builtins.open', side_effect=IOError("Test error"))
    def test_save_dashboard_handles_error(self, mock_file_open):
        """Test that save_dashboard_to_file handles errors gracefully."""
        # Sample dashboard data
        dashboard = {
            'merchants': [{'mid': '123456', 'merchant_dba': 'Merchant 1'}],
            'summary': {'total_merchants': 1},
            'month': '2023-05'
        }
        
        # Call the method - should not raise exception
        try:
            self.generator.save_dashboard_to_file(dashboard, 'merchant', '2023-05')
            assert True  # No exception raised
        except Exception:
            assert False  # Exception was raised
