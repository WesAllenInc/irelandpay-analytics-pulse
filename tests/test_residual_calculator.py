"""
Unit tests for the Residual Calculator module.
"""
import os
import sys
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.analytics.residual_calculator import ResidualCalculator

class TestResidualCalculator:
    """Test cases for the ResidualCalculator class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.calculator = ResidualCalculator()
        
        # Sample merchant and residual data (already merged)
        self.processed_df = pd.DataFrame({
            'mid': ['123456', '789012', '345678'],
            'merchant_dba': ['Merchant 1', 'Merchant 2', 'Merchant 3'],
            'total_volume': [10000.0, 20000.0, 15000.0],
            'net_profit': [500.0, 1000.0, 750.0],
            'agent_name': ['Agent 1', 'Agent 2', 'Agent 1'],
            'month': ['2023-05', '2023-05', '2023-05']
        })
        
        # Sample agent BPS data
        self.agent_bps_df = pd.DataFrame({
            'mid': ['123456', '789012', '345678'],
            'agent_name': ['Agent 1', 'Agent 2', 'Agent 1'],
            'bps': [25, 30, 25]
        })
    
    @patch('irelandpay_analytics.analytics.residual_calculator.pd.read_csv')
    def test_load_agent_bps_data(self, mock_read_csv):
        """Test loading agent BPS data."""
        # Mock the read_csv function
        mock_read_csv.return_value = self.agent_bps_df
        
        # Call the method
        result = self.calculator.load_agent_bps_data()
        
        # Verify the result
        assert result is not None
        assert len(result) == 3
        assert 'mid' in result.columns
        assert 'agent_name' in result.columns
        assert 'bps' in result.columns
    
    def test_calculate_residuals(self):
        """Test calculating residuals."""
        # Mock the load_agent_bps_data method
        self.calculator.load_agent_bps_data = MagicMock(return_value=self.agent_bps_df)
        
        # Call the method
        result = self.calculator.calculate_residuals(self.processed_df)
        
        # Verify the result
        assert result is not None
        assert len(result) == 3
        assert 'residual_amount' in result.columns
        
        # Check residual calculations
        # Residual = (BPS / 100) * total_volume
        assert result.iloc[0]['residual_amount'] == 25.0  # (25/100) * 10000 / 100
        assert result.iloc[1]['residual_amount'] == 60.0  # (30/100) * 20000 / 100
        assert result.iloc[2]['residual_amount'] == 37.5  # (25/100) * 15000 / 100
    
    def test_calculate_residuals_without_bps(self):
        """Test calculating residuals without BPS data."""
        # Mock the load_agent_bps_data method to return empty DataFrame
        self.calculator.load_agent_bps_data = MagicMock(return_value=pd.DataFrame())
        
        # Call the method
        result = self.calculator.calculate_residuals(self.processed_df)
        
        # Verify the result
        assert result is not None
        assert len(result) == 3
        assert 'residual_amount' in result.columns
        
        # Check residual calculations - should use default BPS
        default_bps = 20  # Assuming default BPS is 20
        assert result.iloc[0]['residual_amount'] == 20.0  # (20/100) * 10000 / 100
        assert result.iloc[1]['residual_amount'] == 40.0  # (20/100) * 20000 / 100
        assert result.iloc[2]['residual_amount'] == 30.0  # (20/100) * 15000 / 100
    
    def test_calculate_residuals_with_missing_mid(self):
        """Test calculating residuals with missing MID in BPS data."""
        # Create BPS data with missing MID
        bps_df = pd.DataFrame({
            'mid': ['123456', '789012'],  # Missing 345678
            'agent_name': ['Agent 1', 'Agent 2'],
            'bps': [25, 30]
        })
        
        # Mock the load_agent_bps_data method
        self.calculator.load_agent_bps_data = MagicMock(return_value=bps_df)
        
        # Call the method
        result = self.calculator.calculate_residuals(self.processed_df)
        
        # Verify the result
        assert result is not None
        assert len(result) == 3
        assert 'residual_amount' in result.columns
        
        # Check residual calculations
        assert result.iloc[0]['residual_amount'] == 25.0  # (25/100) * 10000 / 100
        assert result.iloc[1]['residual_amount'] == 60.0  # (30/100) * 20000 / 100
        assert result.iloc[2]['residual_amount'] == 30.0  # (20/100) * 15000 / 100 (default BPS)
    
    def test_aggregate_agent_earnings(self):
        """Test aggregating agent earnings."""
        # Add residual_amount column to the processed DataFrame
        df = self.processed_df.copy()
        df['residual_amount'] = [25.0, 60.0, 37.5]
        
        # Call the method
        result = self.calculator.aggregate_agent_earnings(df)
        
        # Verify the result
        assert result is not None
        assert len(result) == 2  # Two unique agents
        assert 'agent_name' in result.columns
        assert 'total_earnings' in result.columns
        assert 'merchant_count' in result.columns
        assert 'total_volume' in result.columns
        
        # Check aggregation calculations
        agent1_row = result[result['agent_name'] == 'Agent 1'].iloc[0]
        agent2_row = result[result['agent_name'] == 'Agent 2'].iloc[0]
        
        assert agent1_row['total_earnings'] == 62.5  # 25.0 + 37.5
        assert agent1_row['merchant_count'] == 2  # Two merchants for Agent 1
        assert agent1_row['total_volume'] == 25000.0  # 10000 + 15000
        
        assert agent2_row['total_earnings'] == 60.0
        assert agent2_row['merchant_count'] == 1
        assert agent2_row['total_volume'] == 20000.0
    
    def test_aggregate_agent_earnings_with_empty_data(self):
        """Test aggregating agent earnings with empty data."""
        # Call the method with empty DataFrame
        result = self.calculator.aggregate_agent_earnings(pd.DataFrame())
        
        # Verify the result
        assert result is not None
        assert len(result) == 0
    
    def test_calculate_agent_performance_metrics(self):
        """Test calculating agent performance metrics."""
        # Create agent earnings DataFrame
        agent_df = pd.DataFrame({
            'agent_name': ['Agent 1', 'Agent 2'],
            'total_earnings': [62.5, 60.0],
            'merchant_count': [2, 1],
            'total_volume': [25000.0, 20000.0],
            'month': ['2023-05', '2023-05']
        })
        
        # Call the method
        result = self.calculator.calculate_agent_performance_metrics(agent_df)
        
        # Verify the result
        assert result is not None
        assert len(result) == 2
        assert 'avg_merchant_volume' in result.columns
        assert 'avg_merchant_earnings' in result.columns
        assert 'effective_bps' in result.columns
        
        # Check metric calculations
        agent1_row = result[result['agent_name'] == 'Agent 1'].iloc[0]
        agent2_row = result[result['agent_name'] == 'Agent 2'].iloc[0]
        
        assert agent1_row['avg_merchant_volume'] == 12500.0  # 25000 / 2
        assert agent1_row['avg_merchant_earnings'] == 31.25  # 62.5 / 2
        assert agent1_row['effective_bps'] == 25.0  # (62.5 / 25000) * 10000
        
        assert agent2_row['avg_merchant_volume'] == 20000.0  # 20000 / 1
        assert agent2_row['avg_merchant_earnings'] == 60.0  # 60 / 1
        assert agent2_row['effective_bps'] == 30.0  # (60 / 20000) * 10000
    
    def test_calculate_agent_performance_metrics_with_zero_values(self):
        """Test calculating agent performance metrics with zero values."""
        # Create agent earnings DataFrame with zero values
        agent_df = pd.DataFrame({
            'agent_name': ['Agent 3'],
            'total_earnings': [0.0],
            'merchant_count': [0],
            'total_volume': [0.0],
            'month': ['2023-05']
        })
        
        # Call the method
        result = self.calculator.calculate_agent_performance_metrics(agent_df)
        
        # Verify the result
        assert result is not None
        assert len(result) == 1
        
        # Check metric calculations - should handle division by zero
        assert result.iloc[0]['avg_merchant_volume'] == 0.0
        assert result.iloc[0]['avg_merchant_earnings'] == 0.0
        assert result.iloc[0]['effective_bps'] == 0.0
