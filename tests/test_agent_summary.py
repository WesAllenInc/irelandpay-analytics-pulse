"""
Unit tests for the Agent Summary module.
"""
import os
import sys
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.analytics.agent_summary import AgentSummary

class TestAgentSummary:
    """Test cases for the AgentSummary class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.analyzer = AgentSummary()
        
        # Sample agent earnings data
        self.agent_df = pd.DataFrame({
            'agent_name': ['Agent 1', 'Agent 2', 'Agent 3'],
            'total_volume': [100000.0, 200000.0, 50000.0],
            'total_earnings': [5000.0, 8000.0, 2000.0],
            'merchant_count': [10, 15, 5],
            'month': ['2023-05', '2023-05', '2023-05']
        })
        
        # Add effective BPS
        self.agent_df['effective_bps'] = (self.agent_df['total_earnings'] / self.agent_df['total_volume']) * 10000
        
        # Sample historical data for trend analysis
        self.historical_df = pd.DataFrame({
            'agent_name': ['Agent 1', 'Agent 1', 'Agent 2', 'Agent 2', 'Agent 3', 'Agent 3'],
            'month': ['2023-04', '2023-03', '2023-04', '2023-03', '2023-04', '2023-03'],
            'total_volume': [90000.0, 80000.0, 180000.0, 160000.0, 45000.0, 40000.0],
            'total_earnings': [4500.0, 4000.0, 7200.0, 6400.0, 1800.0, 1600.0],
            'merchant_count': [9, 8, 14, 12, 5, 4]
        })
        
        # Add effective BPS to historical data
        self.historical_df['effective_bps'] = (self.historical_df['total_earnings'] / self.historical_df['total_volume']) * 10000
    
    def test_calculate_agent_metrics(self):
        """Test calculating agent metrics."""
        # Call the method
        result = self.analyzer.calculate_agent_metrics(self.agent_df)
        
        # Verify the results
        assert len(result) == 3
        assert 'agent_name' in result.columns
        assert 'total_volume' in result.columns
        assert 'total_earnings' in result.columns
        assert 'merchant_count' in result.columns
        assert 'effective_bps' in result.columns
    
    def test_get_top_agents(self):
        """Test getting top agents."""
        # Call the method
        top_agents = self.analyzer.get_top_agents(self.agent_df, n=2)
        
        # Verify the results
        assert len(top_agents) == 2
        assert top_agents.iloc[0]['agent_name'] == 'Agent 2'  # Highest earnings
        assert top_agents.iloc[1]['agent_name'] == 'Agent 1'  # Second highest earnings
    
    def test_get_top_agents_by_volume(self):
        """Test getting top agents by volume."""
        # Call the method
        top_agents = self.analyzer.get_top_agents_by_volume(self.agent_df, n=2)
        
        # Verify the results
        assert len(top_agents) == 2
        assert top_agents.iloc[0]['agent_name'] == 'Agent 2'  # Highest volume
        assert top_agents.iloc[1]['agent_name'] == 'Agent 1'  # Second highest volume
    
    def test_get_top_agents_by_bps(self):
        """Test getting top agents by BPS."""
        # Call the method
        top_agents = self.analyzer.get_top_agents_by_bps(self.agent_df, n=2)
        
        # Verify the results
        assert len(top_agents) == 2
        
        # Check that the agents are sorted by effective BPS
        assert top_agents.iloc[0]['effective_bps'] >= top_agents.iloc[1]['effective_bps']
    
    def test_calculate_month_over_month_changes(self):
        """Test calculating month-over-month changes."""
        # Combine current and historical data
        combined_df = pd.concat([self.agent_df, self.historical_df])
        
        # Call the method
        changes = self.analyzer.calculate_month_over_month_changes(combined_df, current_month='2023-05', previous_month='2023-04')
        
        # Verify the results
        assert len(changes) == 3  # One row per agent
        assert 'agent_name' in changes.columns
        assert 'volume_change' in changes.columns
        assert 'volume_change_pct' in changes.columns
        assert 'earnings_change' in changes.columns
        assert 'earnings_change_pct' in changes.columns
        
        # Check specific changes for Agent 1
        agent1_row = changes[changes['agent_name'] == 'Agent 1'].iloc[0]
        assert agent1_row['volume_change'] == 10000.0  # 100000 - 90000
        assert agent1_row['volume_change_pct'] == pytest.approx(11.11, 0.01)  # (100000 - 90000) / 90000 * 100
        assert agent1_row['earnings_change'] == 500.0  # 5000 - 4500
        assert agent1_row['earnings_change_pct'] == pytest.approx(11.11, 0.01)  # (5000 - 4500) / 4500 * 100
    
    def test_identify_outliers(self):
        """Test identifying outliers."""
        # Call the method
        outliers = self.analyzer.identify_outliers(self.agent_df)
        
        # Verify the results
        assert isinstance(outliers, dict)
        assert 'volume_outliers' in outliers
        assert 'earnings_outliers' in outliers
        assert 'bps_outliers' in outliers
    
    def test_calculate_agent_trend(self):
        """Test calculating agent trend."""
        # Combine current and historical data
        combined_df = pd.concat([self.agent_df, self.historical_df])
        
        # Call the method
        trend = self.analyzer.calculate_agent_trend('Agent 1', combined_df)
        
        # Verify the results
        assert len(trend) == 3  # Three months of data
        assert 'month' in trend.columns
        assert 'total_volume' in trend.columns
        assert 'total_earnings' in trend.columns
        assert 'merchant_count' in trend.columns
        
        # Check that the months are sorted
        assert trend.iloc[0]['month'] == '2023-03'
        assert trend.iloc[1]['month'] == '2023-04'
        assert trend.iloc[2]['month'] == '2023-05'
    
    def test_generate_agent_report(self):
        """Test generating agent report."""
        # Combine current and historical data
        combined_df = pd.concat([self.agent_df, self.historical_df])
        
        # Call the method
        report = self.analyzer.generate_agent_report('Agent 1', combined_df, current_month='2023-05')
        
        # Verify the results
        assert isinstance(report, dict)
        assert 'agent_name' in report
        assert 'current_month' in report
        assert 'summary' in report
        assert 'trend' in report
        assert 'merchants' in report
        
        # Check that the agent name is correct
        assert report['agent_name'] == 'Agent 1'
        
        # Check that the current month is correct
        assert report['current_month'] == '2023-05'
        
        # Check that the summary contains the expected fields
        assert 'total_volume' in report['summary']
        assert 'total_earnings' in report['summary']
        assert 'merchant_count' in report['summary']
        assert 'effective_bps' in report['summary']
        
        # Check that the trend contains data for all three months
        assert len(report['trend']) == 3
