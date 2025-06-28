"""
Unit tests for the Merchant Summary module.
"""
import os
import sys
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.analytics.merchant_summary import MerchantSummary

class TestMerchantSummary:
    """Test cases for the MerchantSummary class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.analyzer = MerchantSummary()
        
        # Sample merchant data
        self.merchant_df = pd.DataFrame({
            'mid': ['123456', '789012', '345678'],
            'merchant_dba': ['Merchant 1', 'Merchant 2', 'Merchant 3'],
            'total_volume': [10000.0, 20000.0, 5000.0],
            'total_txns': [100, 200, 50],
            'net_profit': [500.0, 1000.0, 250.0],
            'agent_name': ['Agent 1', 'Agent 2', 'Agent 1'],
            'month': ['2023-05', '2023-05', '2023-05']
        })
        
        # Add calculated fields
        self.merchant_df['profit_margin'] = (self.merchant_df['net_profit'] / self.merchant_df['total_volume']) * 100
        self.merchant_df['bps'] = (self.merchant_df['net_profit'] / self.merchant_df['total_volume']) * 10000
        self.merchant_df['avg_txn_size'] = self.merchant_df['total_volume'] / self.merchant_df['total_txns']
        
        # Sample historical data for trend analysis
        self.historical_df = pd.DataFrame({
            'mid': ['123456', '123456', '789012', '789012', '345678', '345678'],
            'merchant_dba': ['Merchant 1', 'Merchant 1', 'Merchant 2', 'Merchant 2', 'Merchant 3', 'Merchant 3'],
            'month': ['2023-04', '2023-03', '2023-04', '2023-03', '2023-04', '2023-03'],
            'total_volume': [9000.0, 8000.0, 18000.0, 16000.0, 4500.0, 4000.0],
            'total_txns': [90, 80, 180, 160, 45, 40],
            'net_profit': [450.0, 400.0, 900.0, 800.0, 225.0, 200.0],
            'agent_name': ['Agent 1', 'Agent 1', 'Agent 2', 'Agent 2', 'Agent 1', 'Agent 1']
        })
        
        # Add calculated fields to historical data
        self.historical_df['profit_margin'] = (self.historical_df['net_profit'] / self.historical_df['total_volume']) * 100
        self.historical_df['bps'] = (self.historical_df['net_profit'] / self.historical_df['total_volume']) * 10000
        self.historical_df['avg_txn_size'] = self.historical_df['total_volume'] / self.historical_df['total_txns']
    
    def test_calculate_merchant_metrics(self):
        """Test calculating merchant metrics."""
        # Call the method
        result = self.analyzer.calculate_merchant_metrics(self.merchant_df)
        
        # Verify the results
        assert len(result) == 3
        assert 'mid' in result.columns
        assert 'merchant_dba' in result.columns
        assert 'total_volume' in result.columns
        assert 'total_txns' in result.columns
        assert 'net_profit' in result.columns
        assert 'profit_margin' in result.columns
        assert 'bps' in result.columns
        assert 'avg_txn_size' in result.columns
    
    def test_get_top_merchants(self):
        """Test getting top merchants."""
        # Call the method
        top_merchants = self.analyzer.get_top_merchants(self.merchant_df, n=2)
        
        # Verify the results
        assert len(top_merchants) == 2
        assert top_merchants.iloc[0]['mid'] == '789012'  # Highest volume
        assert top_merchants.iloc[1]['mid'] == '123456'  # Second highest volume
    
    def test_get_top_merchants_by_profit(self):
        """Test getting top merchants by profit."""
        # Call the method
        top_merchants = self.analyzer.get_top_merchants_by_profit(self.merchant_df, n=2)
        
        # Verify the results
        assert len(top_merchants) == 2
        assert top_merchants.iloc[0]['mid'] == '789012'  # Highest profit
        assert top_merchants.iloc[1]['mid'] == '123456'  # Second highest profit
    
    def test_get_top_merchants_by_margin(self):
        """Test getting top merchants by margin."""
        # Create a DataFrame with different profit margins
        df = self.merchant_df.copy()
        df.loc[0, 'profit_margin'] = 6.0  # Merchant 1
        df.loc[1, 'profit_margin'] = 5.0  # Merchant 2
        df.loc[2, 'profit_margin'] = 7.0  # Merchant 3
        
        # Call the method
        top_merchants = self.analyzer.get_top_merchants_by_margin(df, n=2)
        
        # Verify the results
        assert len(top_merchants) == 2
        assert top_merchants.iloc[0]['mid'] == '345678'  # Highest margin (7.0)
        assert top_merchants.iloc[1]['mid'] == '123456'  # Second highest margin (6.0)
    
    def test_calculate_month_over_month_changes(self):
        """Test calculating month-over-month changes."""
        # Combine current and historical data
        combined_df = pd.concat([self.merchant_df, self.historical_df])
        
        # Call the method
        changes = self.analyzer.calculate_month_over_month_changes(combined_df, current_month='2023-05', previous_month='2023-04')
        
        # Verify the results
        assert len(changes) == 3  # One row per merchant
        assert 'mid' in changes.columns
        assert 'merchant_dba' in changes.columns
        assert 'volume_change' in changes.columns
        assert 'volume_change_pct' in changes.columns
        assert 'profit_change' in changes.columns
        assert 'profit_change_pct' in changes.columns
        
        # Check specific changes for Merchant 1
        merchant1_row = changes[changes['mid'] == '123456'].iloc[0]
        assert merchant1_row['volume_change'] == 1000.0  # 10000 - 9000
        assert merchant1_row['volume_change_pct'] == pytest.approx(11.11, 0.01)  # (10000 - 9000) / 9000 * 100
        assert merchant1_row['profit_change'] == 50.0  # 500 - 450
        assert merchant1_row['profit_change_pct'] == pytest.approx(11.11, 0.01)  # (500 - 450) / 450 * 100
    
    def test_identify_outliers(self):
        """Test identifying outliers."""
        # Call the method
        outliers = self.analyzer.identify_outliers(self.merchant_df)
        
        # Verify the results
        assert isinstance(outliers, dict)
        assert 'volume_outliers' in outliers
        assert 'profit_outliers' in outliers
        assert 'margin_outliers' in outliers
    
    def test_calculate_merchant_trend(self):
        """Test calculating merchant trend."""
        # Combine current and historical data
        combined_df = pd.concat([self.merchant_df, self.historical_df])
        
        # Call the method
        trend = self.analyzer.calculate_merchant_trend('123456', combined_df)
        
        # Verify the results
        assert len(trend) == 3  # Three months of data
        assert 'month' in trend.columns
        assert 'total_volume' in trend.columns
        assert 'net_profit' in trend.columns
        assert 'total_txns' in trend.columns
        
        # Check that the months are sorted
        assert trend.iloc[0]['month'] == '2023-03'
        assert trend.iloc[1]['month'] == '2023-04'
        assert trend.iloc[2]['month'] == '2023-05'
    
    def test_generate_merchant_report(self):
        """Test generating merchant report."""
        # Combine current and historical data
        combined_df = pd.concat([self.merchant_df, self.historical_df])
        
        # Call the method
        report = self.analyzer.generate_merchant_report('123456', combined_df, current_month='2023-05')
        
        # Verify the results
        assert isinstance(report, dict)
        assert 'mid' in report
        assert 'merchant_dba' in report
        assert 'current_month' in report
        assert 'summary' in report
        assert 'trend' in report
        
        # Check that the merchant ID is correct
        assert report['mid'] == '123456'
        
        # Check that the merchant name is correct
        assert report['merchant_dba'] == 'Merchant 1'
        
        # Check that the current month is correct
        assert report['current_month'] == '2023-05'
        
        # Check that the summary contains the expected fields
        assert 'total_volume' in report['summary']
        assert 'net_profit' in report['summary']
        assert 'total_txns' in report['summary']
        assert 'profit_margin' in report['summary']
        assert 'bps' in report['summary']
        assert 'avg_txn_size' in report['summary']
        
        # Check that the trend contains data for all three months
        assert len(report['trend']) == 3
