"""
Unit tests for the Dashboard Preparation module.
"""
import os
import sys
import pytest
import pandas as pd
import json
from unittest.mock import patch, MagicMock, mock_open

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.reports.dashboard_prep import DashboardPrep

class TestDashboardPrep:
    """Test cases for the DashboardPrep class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Create a DashboardPrep instance
        self.dashboard_prep = DashboardPrep()
        
        # Sample agent data
        self.agent_data = {
            'agent_name': 'Test Agent',
            'current_month': '2023-05',
            'summary': {
                'total_volume': 100000.0,
                'total_earnings': 5000.0,
                'merchant_count': 10,
                'effective_bps': 50.0
            },
            'trend': [
                {'month': '2023-03', 'total_volume': 80000.0, 'total_earnings': 4000.0},
                {'month': '2023-04', 'total_volume': 90000.0, 'total_earnings': 4500.0},
                {'month': '2023-05', 'total_volume': 100000.0, 'total_earnings': 5000.0}
            ],
            'merchants': [
                {'merchant_dba': 'Merchant 1', 'total_volume': 50000.0, 'residual': 2500.0},
                {'merchant_dba': 'Merchant 2', 'total_volume': 30000.0, 'residual': 1500.0},
                {'merchant_dba': 'Merchant 3', 'total_volume': 20000.0, 'residual': 1000.0}
            ]
        }
        
        # Sample monthly summary data
        self.monthly_summary = {
            'current_month': '2023-05',
            'volume_trend': [
                {'month': '2023-03', 'total_volume': 800000.0},
                {'month': '2023-04', 'total_volume': 900000.0},
                {'month': '2023-05', 'total_volume': 1000000.0}
            ],
            'profit_trend': [
                {'month': '2023-03', 'total_profit': 40000.0},
                {'month': '2023-04', 'total_profit': 45000.0},
                {'month': '2023-05', 'total_profit': 50000.0}
            ],
            'growth_rates': {
                'volume_growth': 25.0,
                'profit_growth': 25.0,
                'merchant_growth': 20.0
            },
            'top_agents': [
                {'agent_name': 'Agent 1', 'total_earnings': 20000.0, 'total_volume': 400000.0},
                {'agent_name': 'Agent 2', 'total_earnings': 15000.0, 'total_volume': 300000.0},
                {'agent_name': 'Agent 3', 'total_earnings': 10000.0, 'total_volume': 200000.0}
            ],
            'top_merchants': [
                {'merchant_dba': 'Merchant 1', 'net_profit': 10000.0, 'total_volume': 200000.0},
                {'merchant_dba': 'Merchant 2', 'net_profit': 7500.0, 'total_volume': 150000.0},
                {'merchant_dba': 'Merchant 3', 'net_profit': 5000.0, 'total_volume': 100000.0}
            ]
        }
        
        # Sample agents list
        self.agents_list = [
            {
                'agent_name': 'Agent 1',
                'current_month': '2023-05',
                'summary': {
                    'total_volume': 400000.0,
                    'total_earnings': 20000.0,
                    'merchant_count': 40,
                    'effective_bps': 50.0
                },
                'trend': [
                    {'month': '2023-03', 'total_volume': 320000.0, 'total_earnings': 16000.0},
                    {'month': '2023-04', 'total_volume': 360000.0, 'total_earnings': 18000.0},
                    {'month': '2023-05', 'total_volume': 400000.0, 'total_earnings': 20000.0}
                ],
                'merchants': [
                    {'merchant_dba': 'Merchant 1', 'total_volume': 100000.0, 'residual': 5000.0},
                    {'merchant_dba': 'Merchant 2', 'total_volume': 80000.0, 'residual': 4000.0}
                ]
            },
            {
                'agent_name': 'Agent 2',
                'current_month': '2023-05',
                'summary': {
                    'total_volume': 300000.0,
                    'total_earnings': 15000.0,
                    'merchant_count': 30,
                    'effective_bps': 50.0
                },
                'trend': [
                    {'month': '2023-03', 'total_volume': 240000.0, 'total_earnings': 12000.0},
                    {'month': '2023-04', 'total_volume': 270000.0, 'total_earnings': 13500.0},
                    {'month': '2023-05', 'total_volume': 300000.0, 'total_earnings': 15000.0}
                ],
                'merchants': [
                    {'merchant_dba': 'Merchant 3', 'total_volume': 70000.0, 'residual': 3500.0},
                    {'merchant_dba': 'Merchant 4', 'total_volume': 60000.0, 'residual': 3000.0}
                ]
            }
        ]
    
    def test_prepare_top_merchants_json(self):
        """Test preparing top merchants JSON."""
        # Call the method
        with patch('builtins.open', mock_open()) as mock_file:
            output_path = self.dashboard_prep.prepare_top_merchants_json(self.monthly_summary['top_merchants'], '2023-05')
        
        # Verify that the file was written
        mock_file.assert_called_once()
        mock_file().write.assert_called_once()
        
        # Get the written data
        written_data = mock_file().write.call_args[0][0]
        json_data = json.loads(written_data)
        
        # Verify the JSON structure
        assert 'month' in json_data
        assert json_data['month'] == '2023-05'
        assert 'merchants' in json_data
        assert len(json_data['merchants']) == 3
        
        # Verify the first merchant
        first_merchant = json_data['merchants'][0]
        assert first_merchant['merchant_dba'] == 'Merchant 1'
        assert first_merchant['net_profit'] == 10000.0
        assert first_merchant['total_volume'] == 200000.0
        
        # Verify the output path
        assert 'top_merchants_2023-05.json' in output_path
    
    def test_prepare_top_agents_json(self):
        """Test preparing top agents JSON."""
        # Call the method
        with patch('builtins.open', mock_open()) as mock_file:
            output_path = self.dashboard_prep.prepare_top_agents_json(self.monthly_summary['top_agents'], '2023-05')
        
        # Verify that the file was written
        mock_file.assert_called_once()
        mock_file().write.assert_called_once()
        
        # Get the written data
        written_data = mock_file().write.call_args[0][0]
        json_data = json.loads(written_data)
        
        # Verify the JSON structure
        assert 'month' in json_data
        assert json_data['month'] == '2023-05'
        assert 'agents' in json_data
        assert len(json_data['agents']) == 3
        
        # Verify the first agent
        first_agent = json_data['agents'][0]
        assert first_agent['agent_name'] == 'Agent 1'
        assert first_agent['total_earnings'] == 20000.0
        assert first_agent['total_volume'] == 400000.0
        
        # Verify the output path
        assert 'top_agents_2023-05.json' in output_path
    
    def test_prepare_volume_trend_json(self):
        """Test preparing volume trend JSON."""
        # Call the method
        with patch('builtins.open', mock_open()) as mock_file:
            output_path = self.dashboard_prep.prepare_volume_trend_json(self.monthly_summary['volume_trend'], '2023-05')
        
        # Verify that the file was written
        mock_file.assert_called_once()
        mock_file().write.assert_called_once()
        
        # Get the written data
        written_data = mock_file().write.call_args[0][0]
        json_data = json.loads(written_data)
        
        # Verify the JSON structure
        assert 'current_month' in json_data
        assert json_data['current_month'] == '2023-05'
        assert 'trend' in json_data
        assert len(json_data['trend']) == 3
        
        # Verify the first month
        first_month = json_data['trend'][0]
        assert first_month['month'] == '2023-03'
        assert first_month['total_volume'] == 800000.0
        
        # Verify the output path
        assert 'volume_trend_2023-05.json' in output_path
    
    def test_prepare_agent_merchants_json(self):
        """Test preparing agent merchants JSON."""
        # Call the method
        with patch('builtins.open', mock_open()) as mock_file:
            output_path = self.dashboard_prep.prepare_agent_merchants_json(self.agent_data)
        
        # Verify that the file was written
        mock_file.assert_called_once()
        mock_file().write.assert_called_once()
        
        # Get the written data
        written_data = mock_file().write.call_args[0][0]
        json_data = json.loads(written_data)
        
        # Verify the JSON structure
        assert 'agent_name' in json_data
        assert json_data['agent_name'] == 'Test Agent'
        assert 'month' in json_data
        assert json_data['month'] == '2023-05'
        assert 'merchants' in json_data
        assert len(json_data['merchants']) == 3
        
        # Verify the first merchant
        first_merchant = json_data['merchants'][0]
        assert first_merchant['merchant_dba'] == 'Merchant 1'
        assert first_merchant['total_volume'] == 50000.0
        assert first_merchant['residual'] == 2500.0
        
        # Verify the output path
        assert 'Test_Agent_merchants_2023-05.json' in output_path
    
    def test_prepare_monthly_summary_json(self):
        """Test preparing monthly summary JSON."""
        # Call the method
        with patch('builtins.open', mock_open()) as mock_file:
            output_path = self.dashboard_prep.prepare_monthly_summary_json(self.monthly_summary)
        
        # Verify that the file was written
        mock_file.assert_called_once()
        mock_file().write.assert_called_once()
        
        # Get the written data
        written_data = mock_file().write.call_args[0][0]
        json_data = json.loads(written_data)
        
        # Verify the JSON structure
        assert 'month' in json_data
        assert json_data['month'] == '2023-05'
        assert 'volume_trend' in json_data
        assert 'profit_trend' in json_data
        assert 'growth_rates' in json_data
        assert 'top_agents' in json_data
        assert 'top_merchants' in json_data
        
        # Verify the growth rates
        assert json_data['growth_rates']['volume_growth'] == 25.0
        assert json_data['growth_rates']['profit_growth'] == 25.0
        assert json_data['growth_rates']['merchant_growth'] == 20.0
        
        # Verify the output path
        assert 'monthly_summary_2023-05.json' in output_path
    
    def test_prepare_agent_dashboard_json(self):
        """Test preparing agent dashboard JSON."""
        # Call the method
        with patch('builtins.open', mock_open()) as mock_file:
            output_path = self.dashboard_prep.prepare_agent_dashboard_json(self.agent_data)
        
        # Verify that the file was written
        mock_file.assert_called_once()
        mock_file().write.assert_called_once()
        
        # Get the written data
        written_data = mock_file().write.call_args[0][0]
        json_data = json.loads(written_data)
        
        # Verify the JSON structure
        assert 'agent_name' in json_data
        assert json_data['agent_name'] == 'Test Agent'
        assert 'month' in json_data
        assert json_data['month'] == '2023-05'
        assert 'summary' in json_data
        assert 'trend' in json_data
        assert 'merchants' in json_data
        
        # Verify the summary
        assert json_data['summary']['total_volume'] == 100000.0
        assert json_data['summary']['total_earnings'] == 5000.0
        assert json_data['summary']['merchant_count'] == 10
        
        # Verify the output path
        assert 'Test_Agent_dashboard_2023-05.json' in output_path
    
    def test_prepare_admin_dashboard_json(self):
        """Test preparing admin dashboard JSON."""
        # Call the method
        with patch('builtins.open', mock_open()) as mock_file:
            output_path = self.dashboard_prep.prepare_admin_dashboard_json(self.agents_list, self.monthly_summary)
        
        # Verify that the file was written
        mock_file.assert_called_once()
        mock_file().write.assert_called_once()
        
        # Get the written data
        written_data = mock_file().write.call_args[0][0]
        json_data = json.loads(written_data)
        
        # Verify the JSON structure
        assert 'month' in json_data
        assert json_data['month'] == '2023-05'
        assert 'agents' in json_data
        assert 'volume_trend' in json_data
        assert 'profit_trend' in json_data
        assert 'growth_rates' in json_data
        assert 'top_merchants' in json_data
        
        # Verify the agents
        assert len(json_data['agents']) == 2
        assert json_data['agents'][0]['agent_name'] == 'Agent 1'
        assert json_data['agents'][0]['total_volume'] == 400000.0
        assert json_data['agents'][0]['total_earnings'] == 20000.0
        
        # Verify the output path
        assert 'admin_dashboard_2023-05.json' in output_path
    
    def test_prepare_all_dashboards(self):
        """Test preparing all dashboards."""
        # Mock the individual preparation methods
        self.dashboard_prep.prepare_top_merchants_json = MagicMock(return_value='top_merchants.json')
        self.dashboard_prep.prepare_top_agents_json = MagicMock(return_value='top_agents.json')
        self.dashboard_prep.prepare_volume_trend_json = MagicMock(return_value='volume_trend.json')
        self.dashboard_prep.prepare_monthly_summary_json = MagicMock(return_value='monthly_summary.json')
        self.dashboard_prep.prepare_agent_dashboard_json = MagicMock(return_value='agent_dashboard.json')
        self.dashboard_prep.prepare_admin_dashboard_json = MagicMock(return_value='admin_dashboard.json')
        
        # Call the method
        output_paths = self.dashboard_prep.prepare_all_dashboards(self.agents_list, self.monthly_summary)
        
        # Verify that all preparation methods were called
        self.dashboard_prep.prepare_top_merchants_json.assert_called_once()
        self.dashboard_prep.prepare_top_agents_json.assert_called_once()
        self.dashboard_prep.prepare_volume_trend_json.assert_called_once()
        self.dashboard_prep.prepare_monthly_summary_json.assert_called_once()
        self.dashboard_prep.prepare_agent_dashboard_json.assert_called()  # Called multiple times
        self.dashboard_prep.prepare_admin_dashboard_json.assert_called_once()
        
        # Verify the output paths
        assert len(output_paths) >= 6  # At least 6 files (top_merchants, top_agents, volume_trend, monthly_summary, admin_dashboard, and at least one agent_dashboard)
        assert 'top_merchants.json' in output_paths
        assert 'top_agents.json' in output_paths
        assert 'volume_trend.json' in output_paths
        assert 'monthly_summary.json' in output_paths
        assert 'agent_dashboard.json' in output_paths
        assert 'admin_dashboard.json' in output_paths
