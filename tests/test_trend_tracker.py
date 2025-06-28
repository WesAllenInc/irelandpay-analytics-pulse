"""
Unit tests for the Trend Tracker module.
"""
import os
import sys
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.analytics.trend_tracker import TrendTracker

class TestTrendTracker:
    """Test cases for the TrendTracker class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.tracker = TrendTracker()
        
        # Sample monthly data for multiple months
        self.monthly_data = pd.DataFrame({
            'month': ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05'],
            'total_volume': [80000.0, 85000.0, 90000.0, 95000.0, 100000.0],
            'total_profit': [4000.0, 4250.0, 4500.0, 4750.0, 5000.0],
            'merchant_count': [80, 85, 90, 95, 100],
            'agent_count': [4, 4, 5, 5, 5]
        })
        
        # Sample agent data for trend analysis
        self.agent_data = pd.DataFrame({
            'agent_name': ['Agent 1', 'Agent 1', 'Agent 1', 'Agent 2', 'Agent 2', 'Agent 2'],
            'month': ['2023-03', '2023-04', '2023-05', '2023-03', '2023-04', '2023-05'],
            'total_volume': [30000.0, 32000.0, 35000.0, 60000.0, 63000.0, 65000.0],
            'total_earnings': [1500.0, 1600.0, 1750.0, 3000.0, 3150.0, 3250.0],
            'merchant_count': [30, 32, 35, 60, 63, 65]
        })
        
        # Sample merchant data for trend analysis
        self.merchant_data = pd.DataFrame({
            'mid': ['123456', '123456', '123456', '789012', '789012', '789012'],
            'merchant_dba': ['Merchant 1', 'Merchant 1', 'Merchant 1', 'Merchant 2', 'Merchant 2', 'Merchant 2'],
            'month': ['2023-03', '2023-04', '2023-05', '2023-03', '2023-04', '2023-05'],
            'total_volume': [5000.0, 5500.0, 6000.0, 10000.0, 10500.0, 11000.0],
            'net_profit': [250.0, 275.0, 300.0, 500.0, 525.0, 550.0],
            'total_txns': [50, 55, 60, 100, 105, 110]
        })
    
    def test_calculate_volume_trend(self):
        """Test calculating volume trend."""
        # Call the method
        trend = self.tracker.calculate_volume_trend(self.monthly_data)
        
        # Verify the results
        assert len(trend) == 5
        assert 'month' in trend.columns
        assert 'total_volume' in trend.columns
        
        # Check that the months are sorted
        assert trend.iloc[0]['month'] == '2023-01'
        assert trend.iloc[-1]['month'] == '2023-05'
        
        # Check that the volumes are correct
        assert trend.iloc[0]['total_volume'] == 80000.0
        assert trend.iloc[-1]['total_volume'] == 100000.0
    
    def test_calculate_profit_trend(self):
        """Test calculating profit trend."""
        # Call the method
        trend = self.tracker.calculate_profit_trend(self.monthly_data)
        
        # Verify the results
        assert len(trend) == 5
        assert 'month' in trend.columns
        assert 'total_profit' in trend.columns
        
        # Check that the months are sorted
        assert trend.iloc[0]['month'] == '2023-01'
        assert trend.iloc[-1]['month'] == '2023-05'
        
        # Check that the profits are correct
        assert trend.iloc[0]['total_profit'] == 4000.0
        assert trend.iloc[-1]['total_profit'] == 5000.0
    
    def test_calculate_merchant_count_trend(self):
        """Test calculating merchant count trend."""
        # Call the method
        trend = self.tracker.calculate_merchant_count_trend(self.monthly_data)
        
        # Verify the results
        assert len(trend) == 5
        assert 'month' in trend.columns
        assert 'merchant_count' in trend.columns
        
        # Check that the months are sorted
        assert trend.iloc[0]['month'] == '2023-01'
        assert trend.iloc[-1]['month'] == '2023-05'
        
        # Check that the merchant counts are correct
        assert trend.iloc[0]['merchant_count'] == 80
        assert trend.iloc[-1]['merchant_count'] == 100
    
    def test_calculate_agent_count_trend(self):
        """Test calculating agent count trend."""
        # Call the method
        trend = self.tracker.calculate_agent_count_trend(self.monthly_data)
        
        # Verify the results
        assert len(trend) == 5
        assert 'month' in trend.columns
        assert 'agent_count' in trend.columns
        
        # Check that the months are sorted
        assert trend.iloc[0]['month'] == '2023-01'
        assert trend.iloc[-1]['month'] == '2023-05'
        
        # Check that the agent counts are correct
        assert trend.iloc[0]['agent_count'] == 4
        assert trend.iloc[-1]['agent_count'] == 5
    
    def test_calculate_growth_rates(self):
        """Test calculating growth rates."""
        # Call the method
        growth = self.tracker.calculate_growth_rates(self.monthly_data)
        
        # Verify the results
        assert isinstance(growth, dict)
        assert 'volume_growth' in growth
        assert 'profit_growth' in growth
        assert 'merchant_growth' in growth
        
        # Check the growth rates
        # Volume growth from 80000 to 100000 over 5 months
        assert growth['volume_growth'] == pytest.approx(25.0, 0.01)  # (100000 - 80000) / 80000 * 100
        
        # Profit growth from 4000 to 5000 over 5 months
        assert growth['profit_growth'] == pytest.approx(25.0, 0.01)  # (5000 - 4000) / 4000 * 100
        
        # Merchant growth from 80 to 100 over 5 months
        assert growth['merchant_growth'] == pytest.approx(25.0, 0.01)  # (100 - 80) / 80 * 100
    
    def test_calculate_month_over_month_changes(self):
        """Test calculating month-over-month changes."""
        # Call the method
        changes = self.tracker.calculate_month_over_month_changes(self.monthly_data)
        
        # Verify the results
        assert len(changes) == 4  # 5 months - 1 = 4 changes
        assert 'month' in changes.columns
        assert 'volume_change_pct' in changes.columns
        assert 'profit_change_pct' in changes.columns
        assert 'merchant_change_pct' in changes.columns
        
        # Check the first month-over-month change
        first_change = changes.iloc[0]
        assert first_change['month'] == '2023-02'
        assert first_change['volume_change_pct'] == pytest.approx(6.25, 0.01)  # (85000 - 80000) / 80000 * 100
        assert first_change['profit_change_pct'] == pytest.approx(6.25, 0.01)  # (4250 - 4000) / 4000 * 100
        assert first_change['merchant_change_pct'] == pytest.approx(6.25, 0.01)  # (85 - 80) / 80 * 100
    
    def test_calculate_agent_volume_trends(self):
        """Test calculating agent volume trends."""
        # Call the method
        trends = self.tracker.calculate_agent_volume_trends(self.agent_data)
        
        # Verify the results
        assert len(trends) == 2  # Two agents
        assert 'Agent 1' in trends
        assert 'Agent 2' in trends
        
        # Check Agent 1's trend
        agent1_trend = trends['Agent 1']
        assert len(agent1_trend) == 3  # Three months
        assert agent1_trend.iloc[0]['month'] == '2023-03'
        assert agent1_trend.iloc[-1]['month'] == '2023-05'
        assert agent1_trend.iloc[0]['total_volume'] == 30000.0
        assert agent1_trend.iloc[-1]['total_volume'] == 35000.0
        
        # Check Agent 2's trend
        agent2_trend = trends['Agent 2']
        assert len(agent2_trend) == 3  # Three months
        assert agent2_trend.iloc[0]['month'] == '2023-03'
        assert agent2_trend.iloc[-1]['month'] == '2023-05'
        assert agent2_trend.iloc[0]['total_volume'] == 60000.0
        assert agent2_trend.iloc[-1]['total_volume'] == 65000.0
    
    def test_calculate_merchant_volume_trends(self):
        """Test calculating merchant volume trends."""
        # Call the method
        trends = self.tracker.calculate_merchant_volume_trends(self.merchant_data)
        
        # Verify the results
        assert len(trends) == 2  # Two merchants
        assert '123456' in trends
        assert '789012' in trends
        
        # Check Merchant 1's trend
        merchant1_trend = trends['123456']
        assert len(merchant1_trend) == 3  # Three months
        assert merchant1_trend.iloc[0]['month'] == '2023-03'
        assert merchant1_trend.iloc[-1]['month'] == '2023-05'
        assert merchant1_trend.iloc[0]['total_volume'] == 5000.0
        assert merchant1_trend.iloc[-1]['total_volume'] == 6000.0
        
        # Check Merchant 2's trend
        merchant2_trend = trends['789012']
        assert len(merchant2_trend) == 3  # Three months
        assert merchant2_trend.iloc[0]['month'] == '2023-03'
        assert merchant2_trend.iloc[-1]['month'] == '2023-05'
        assert merchant2_trend.iloc[0]['total_volume'] == 10000.0
        assert merchant2_trend.iloc[-1]['total_volume'] == 11000.0
    
    def test_forecast_future_volume(self):
        """Test forecasting future volume."""
        # Call the method
        forecast = self.tracker.forecast_future_volume(self.monthly_data, months_ahead=2)
        
        # Verify the results
        assert len(forecast) == 2  # Two months ahead
        assert 'month' in forecast.columns
        assert 'forecasted_volume' in forecast.columns
        
        # Check the forecasted months
        assert forecast.iloc[0]['month'] == '2023-06'
        assert forecast.iloc[1]['month'] == '2023-07'
        
        # Check that the forecasted values are reasonable
        # The trend is linear, so we expect around 105000 for June and 110000 for July
        assert 100000.0 < forecast.iloc[0]['forecasted_volume'] < 110000.0
        assert 105000.0 < forecast.iloc[1]['forecasted_volume'] < 115000.0
    
    def test_forecast_future_profit(self):
        """Test forecasting future profit."""
        # Call the method
        forecast = self.tracker.forecast_future_profit(self.monthly_data, months_ahead=2)
        
        # Verify the results
        assert len(forecast) == 2  # Two months ahead
        assert 'month' in forecast.columns
        assert 'forecasted_profit' in forecast.columns
        
        # Check the forecasted months
        assert forecast.iloc[0]['month'] == '2023-06'
        assert forecast.iloc[1]['month'] == '2023-07'
        
        # Check that the forecasted values are reasonable
        # The trend is linear, so we expect around 5250 for June and 5500 for July
        assert 5000.0 < forecast.iloc[0]['forecasted_profit'] < 5500.0
        assert 5250.0 < forecast.iloc[1]['forecasted_profit'] < 5750.0
    
    def test_generate_trend_report(self):
        """Test generating trend report."""
        # Call the method
        report = self.tracker.generate_trend_report(
            self.monthly_data,
            self.agent_data,
            self.merchant_data,
            current_month='2023-05',
            forecast_months=2
        )
        
        # Verify the results
        assert isinstance(report, dict)
        assert 'current_month' in report
        assert 'volume_trend' in report
        assert 'profit_trend' in report
        assert 'merchant_count_trend' in report
        assert 'agent_count_trend' in report
        assert 'growth_rates' in report
        assert 'month_over_month_changes' in report
        assert 'agent_volume_trends' in report
        assert 'merchant_volume_trends' in report
        assert 'volume_forecast' in report
        assert 'profit_forecast' in report
        
        # Check that the current month is correct
        assert report['current_month'] == '2023-05'
        
        # Check that the volume trend contains all months
        assert len(report['volume_trend']) == 5
        
        # Check that the agent volume trends contains both agents
        assert len(report['agent_volume_trends']) == 2
        assert 'Agent 1' in report['agent_volume_trends']
        assert 'Agent 2' in report['agent_volume_trends']
        
        # Check that the merchant volume trends contains both merchants
        assert len(report['merchant_volume_trends']) == 2
        assert '123456' in report['merchant_volume_trends']
        assert '789012' in report['merchant_volume_trends']
        
        # Check that the volume forecast contains two months
        assert len(report['volume_forecast']) == 2
