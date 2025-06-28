"""
Unit tests for the Residual Calculator module.
"""
import os
import sys
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, mock_open, MagicMock

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.ingest.residual_calcs import ResidualCalculator
from irelandpay_analytics.config import settings

class TestResidualCalculator:
    """Test cases for the ResidualCalculator class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.calculator = ResidualCalculator()
        
        # Sample merchant data
        self.merchant_df = pd.DataFrame({
            'mid': ['123456', '789012', '345678'],
            'merchant_dba': ['Merchant 1', 'Merchant 2', 'Merchant 3'],
            'total_volume': [10000.0, 20000.0, 30000.0],
            'total_txns': [100, 200, 300],
            'net_profit': [500.0, 1000.0, 1500.0],
            'agent_name': ['Agent 1', 'Agent 2', 'Agent 1']
        })
        
        # Add profit margin
        self.merchant_df['profit_margin'] = (self.merchant_df['net_profit'] / self.merchant_df['total_volume']) * 100
        
        # Sample equipment balances
        self.equipment_balances = pd.DataFrame({
            'mid': ['123456', '789012'],
            'equipment_balance': [200.0, 300.0]
        })
        
        # Sample agent splits
        self.agent_splits = pd.DataFrame({
            'agent_name': ['Agent 1', 'Agent 2'],
            'split_percentage': [0.7, 0.8]
        })
    
    def test_calculate_basis_points(self):
        """Test calculating basis points."""
        # Call the method
        result_df = self.calculator.calculate_basis_points(self.merchant_df)
        
        # Verify the results
        assert 'bps' in result_df.columns
        assert result_df.iloc[0]['bps'] == 50.0  # (500/10000) * 100
        assert result_df.iloc[1]['bps'] == 50.0  # (1000/20000) * 100
        assert result_df.iloc[2]['bps'] == 50.0  # (1500/30000) * 100
    
    def test_apply_office_fee(self):
        """Test applying office fee."""
        # Set up test data
        df = pd.DataFrame({
            'net_profit': [500.0, 1000.0, 1500.0]
        })
        
        # Call the method with 10% office fee
        result_df = self.calculator.apply_office_fee(df, 0.1)
        
        # Verify the results
        assert 'office_fee' in result_df.columns
        assert 'profit_after_office_fee' in result_df.columns
        assert result_df.iloc[0]['office_fee'] == 50.0  # 500 * 0.1
        assert result_df.iloc[1]['office_fee'] == 100.0  # 1000 * 0.1
        assert result_df.iloc[2]['office_fee'] == 150.0  # 1500 * 0.1
        assert result_df.iloc[0]['profit_after_office_fee'] == 450.0  # 500 - 50
        assert result_df.iloc[1]['profit_after_office_fee'] == 900.0  # 1000 - 100
        assert result_df.iloc[2]['profit_after_office_fee'] == 1350.0  # 1500 - 150
    
    def test_apply_equipment_recovery(self):
        """Test applying equipment recovery."""
        # Set up test data
        df = pd.DataFrame({
            'mid': ['123456', '789012', '345678'],
            'profit_after_office_fee': [450.0, 900.0, 1350.0]
        })
        
        # Call the method with 5% equipment recovery rate
        result_df = self.calculator.apply_equipment_recovery(df, self.equipment_balances, 0.05)
        
        # Verify the results
        assert 'equipment_balance' in result_df.columns
        assert 'equipment_recovery' in result_df.columns
        assert 'profit_after_equipment' in result_df.columns
        
        # Check equipment balance is correctly joined
        assert result_df.iloc[0]['equipment_balance'] == 200.0
        assert result_df.iloc[1]['equipment_balance'] == 300.0
        assert pd.isna(result_df.iloc[2]['equipment_balance'])  # No balance for this MID
        
        # Check equipment recovery calculation
        assert result_df.iloc[0]['equipment_recovery'] == 22.5  # 450 * 0.05
        assert result_df.iloc[1]['equipment_recovery'] == 45.0  # 900 * 0.05
        assert result_df.iloc[2]['equipment_recovery'] == 0.0  # No balance, so no recovery
        
        # Check profit after equipment recovery
        assert result_df.iloc[0]['profit_after_equipment'] == 427.5  # 450 - 22.5
        assert result_df.iloc[1]['profit_after_equipment'] == 855.0  # 900 - 45
        assert result_df.iloc[2]['profit_after_equipment'] == 1350.0  # 1350 - 0
    
    def test_apply_agent_splits(self):
        """Test applying agent splits."""
        # Set up test data
        df = pd.DataFrame({
            'agent_name': ['Agent 1', 'Agent 2', 'Agent 1'],
            'profit_after_equipment': [427.5, 855.0, 1350.0]
        })
        
        # Call the method
        result_df = self.calculator.apply_agent_splits(df, self.agent_splits)
        
        # Verify the results
        assert 'split_percentage' in result_df.columns
        assert 'agent_earnings' in result_df.columns
        assert 'company_earnings' in result_df.columns
        
        # Check split percentage is correctly joined
        assert result_df.iloc[0]['split_percentage'] == 0.7
        assert result_df.iloc[1]['split_percentage'] == 0.8
        assert result_df.iloc[2]['split_percentage'] == 0.7
        
        # Check earnings calculation
        assert result_df.iloc[0]['agent_earnings'] == 299.25  # 427.5 * 0.7
        assert result_df.iloc[1]['agent_earnings'] == 684.0  # 855.0 * 0.8
        assert result_df.iloc[2]['agent_earnings'] == 945.0  # 1350.0 * 0.7
        
        assert result_df.iloc[0]['company_earnings'] == 128.25  # 427.5 * 0.3
        assert result_df.iloc[1]['company_earnings'] == 171.0  # 855.0 * 0.2
        assert result_df.iloc[2]['company_earnings'] == 405.0  # 1350.0 * 0.3
    
    def test_apply_residual_calculations(self):
        """Test applying all residual calculations."""
        # Mock the individual calculation methods
        with patch.object(self.calculator, 'calculate_basis_points') as mock_bps, \
             patch.object(self.calculator, 'apply_office_fee') as mock_office, \
             patch.object(self.calculator, 'apply_equipment_recovery') as mock_equipment, \
             patch.object(self.calculator, 'apply_agent_splits') as mock_splits:
            
            # Set up the mock return values to chain the calls
            mock_bps.return_value = self.merchant_df.copy()
            mock_office.return_value = self.merchant_df.copy()
            mock_equipment.return_value = self.merchant_df.copy()
            mock_splits.return_value = self.merchant_df.copy()
            
            # Call the method
            result_df = self.calculator.apply_residual_calculations(
                self.merchant_df,
                self.equipment_balances,
                self.agent_splits
            )
            
            # Verify that all methods were called with the correct arguments
            mock_bps.assert_called_once()
            mock_office.assert_called_once()
            mock_equipment.assert_called_once()
            mock_splits.assert_called_once()
    
    def test_calculate_agent_earnings(self):
        """Test calculating agent earnings."""
        # Set up test data with agent earnings
        df = pd.DataFrame({
            'agent_name': ['Agent 1', 'Agent 2', 'Agent 1'],
            'merchant_dba': ['Merchant 1', 'Merchant 2', 'Merchant 3'],
            'total_volume': [10000.0, 20000.0, 30000.0],
            'net_profit': [500.0, 1000.0, 1500.0],
            'agent_earnings': [299.25, 684.0, 945.0]
        })
        
        # Call the method
        result_df = self.calculator.calculate_agent_earnings(df, self.agent_splits)
        
        # Verify the results
        assert len(result_df) == 2  # Should have one row per agent
        
        # Find Agent 1 row
        agent1_row = result_df[result_df['agent_name'] == 'Agent 1'].iloc[0]
        
        # Check aggregated values for Agent 1
        assert agent1_row['total_volume'] == 40000.0  # 10000 + 30000
        assert agent1_row['total_earnings'] == 1244.25  # 299.25 + 945.0
        assert agent1_row['merchant_count'] == 2
        
        # Find Agent 2 row
        agent2_row = result_df[result_df['agent_name'] == 'Agent 2'].iloc[0]
        
        # Check values for Agent 2
        assert agent2_row['total_volume'] == 20000.0
        assert agent2_row['total_earnings'] == 684.0
        assert agent2_row['merchant_count'] == 1
    
    def test_load_equipment_balances(self):
        """Test loading equipment balances from CSV."""
        # Mock CSV content
        csv_content = "mid,equipment_balance\n123456,200.0\n789012,300.0"
        
        # Mock open function
        with patch('builtins.open', mock_open(read_data=csv_content)), \
             patch('pandas.read_csv') as mock_read_csv:
            
            # Set up mock return value
            mock_read_csv.return_value = pd.DataFrame({
                'mid': ['123456', '789012'],
                'equipment_balance': [200.0, 300.0]
            })
            
            # Call the method
            result_df = self.calculator.load_equipment_balances()
            
            # Verify the results
            assert len(result_df) == 2
            assert 'mid' in result_df.columns
            assert 'equipment_balance' in result_df.columns
    
    def test_load_agent_splits(self):
        """Test loading agent splits from CSV."""
        # Mock CSV content
        csv_content = "agent_name,split_percentage\nAgent 1,0.7\nAgent 2,0.8"
        
        # Mock open function
        with patch('builtins.open', mock_open(read_data=csv_content)), \
             patch('pandas.read_csv') as mock_read_csv:
            
            # Set up mock return value
            mock_read_csv.return_value = pd.DataFrame({
                'agent_name': ['Agent 1', 'Agent 2'],
                'split_percentage': [0.7, 0.8]
            })
            
            # Call the method
            result_df = self.calculator.load_agent_splits()
            
            # Verify the results
            assert len(result_df) == 2
            assert 'agent_name' in result_df.columns
            assert 'split_percentage' in result_df.columns
