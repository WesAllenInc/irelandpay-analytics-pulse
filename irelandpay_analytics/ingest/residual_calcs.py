"""
Residual calculations module for applying proprietary residual logic.
"""
import logging
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

from irelandpay_analytics.config import settings

logger = logging.getLogger(__name__)

class ResidualCalculator:
    """Applies proprietary residual calculations to merchant and residual data."""
    
    def __init__(self):
        """Initialize the residual calculator."""
        self.office_fee_percentage = settings.OFFICE_FEE_PERCENTAGE
        self.equipment_recovery_rate = settings.EQUIPMENT_RECOVERY_RATE
        logger.info(f"Initialized ResidualCalculator with office fee: {self.office_fee_percentage}, "
                   f"equipment recovery rate: {self.equipment_recovery_rate}")
    
    def calculate_office_fees(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate office utilization fees.
        
        Args:
            df: DataFrame with residual data
            
        Returns:
            DataFrame with added office fee calculations
        """
        df = df.copy()
        
        # Calculate office fees based on net profit
        df['office_fee'] = df['net_profit'] * self.office_fee_percentage
        
        # Adjust net profit
        df['net_profit_after_fees'] = df['net_profit'] - df['office_fee']
        
        logger.info(f"Calculated office fees for {len(df)} records")
        return df
    
    def calculate_equipment_recovery(self, df: pd.DataFrame, equipment_balances: Dict[str, float]) -> pd.DataFrame:
        """
        Calculate equipment recovery amounts.
        
        Args:
            df: DataFrame with residual data
            equipment_balances: Dictionary mapping merchant IDs to equipment balances
            
        Returns:
            DataFrame with added equipment recovery calculations
        """
        df = df.copy()
        
        # Initialize equipment recovery column
        df['equipment_recovery'] = 0.0
        
        # For each merchant with an equipment balance
        for mid, balance in equipment_balances.items():
            if mid in df['mid'].values and balance > 0:
                # Find the merchant's row
                idx = df[df['mid'] == mid].index
                
                # Calculate recovery amount (percentage of net profit or remaining balance, whichever is smaller)
                max_recovery = df.loc[idx, 'net_profit_after_fees'] * self.equipment_recovery_rate
                recovery_amount = min(max_recovery, balance)
                
                # Update the DataFrame
                df.loc[idx, 'equipment_recovery'] = recovery_amount
        
        # Adjust net profit after equipment recovery
        df['final_net_profit'] = df['net_profit_after_fees'] - df['equipment_recovery']
        
        logger.info(f"Calculated equipment recovery for {len(equipment_balances)} merchants")
        return df
    
    def apply_agent_splits(self, df: pd.DataFrame, agent_splits: Dict[str, Dict[str, float]]) -> pd.DataFrame:
        """
        Apply agent/partner residual splits.
        
        Args:
            df: DataFrame with residual data
            agent_splits: Dictionary mapping merchant IDs to dictionaries of agent names and split percentages
            
        Returns:
            DataFrame with agent splits applied
        """
        df = df.copy()
        
        # Create a list to store individual agent earnings
        agent_earnings = []
        
        # For each merchant
        for _, row in df.iterrows():
            mid = row['mid']
            
            # If this merchant has agent splits defined
            if mid in agent_splits:
                # Get the splits for this merchant
                splits = agent_splits[mid]
                
                # For each agent/partner
                for agent_name, split_percentage in splits.items():
                    # Calculate the agent's earnings
                    earnings = row['final_net_profit'] * split_percentage
                    
                    # Add to the list
                    agent_earnings.append({
                        'mid': mid,
                        'agent_name': agent_name,
                        'split_percentage': split_percentage,
                        'earnings': earnings,
                        'payout_month': row['payout_month']
                    })
        
        # Convert to DataFrame
        if agent_earnings:
            agent_df = pd.DataFrame(agent_earnings)
            logger.info(f"Applied agent splits for {len(agent_earnings)} records")
            return agent_df
        else:
            logger.warning("No agent splits applied - empty result")
            return pd.DataFrame(columns=['mid', 'agent_name', 'split_percentage', 'earnings', 'payout_month'])
    
    def calculate_basis_points(self, merchant_df: pd.DataFrame, residual_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate effective basis points (BPS) for each merchant.
        
        Args:
            merchant_df: DataFrame with merchant volume data
            residual_df: DataFrame with residual data
            
        Returns:
            DataFrame with BPS calculations
        """
        # Merge the DataFrames on merchant ID
        merged_df = pd.merge(
            merchant_df[['mid', 'total_volume', 'month']],
            residual_df[['mid', 'net_profit', 'payout_month']],
            left_on=['mid', 'month'],
            right_on=['mid', 'payout_month'],
            how='inner'
        )
        
        # Calculate BPS (basis points)
        # BPS = (Net Profit / Volume) * 10000
        merged_df['bps'] = np.where(
            merged_df['total_volume'] > 0,
            (merged_df['net_profit'] / merged_df['total_volume']) * 10000,
            0
        )
        
        logger.info(f"Calculated BPS for {len(merged_df)} merchants")
        return merged_df
    
    def process_residuals(self, merchant_df: pd.DataFrame, residual_df: pd.DataFrame, 
                         equipment_balances: Optional[Dict[str, float]] = None,
                         agent_splits: Optional[Dict[str, Dict[str, float]]] = None) -> Dict[str, pd.DataFrame]:
        """
        Process residuals with all calculations.
        
        Args:
            merchant_df: DataFrame with merchant data
            residual_df: DataFrame with residual data
            equipment_balances: Dictionary mapping merchant IDs to equipment balances
            agent_splits: Dictionary mapping merchant IDs to dictionaries of agent names and split percentages
            
        Returns:
            Dictionary with processed DataFrames
        """
        # Default empty dictionaries if not provided
        equipment_balances = equipment_balances or {}
        agent_splits = agent_splits or {}
        
        # Calculate basis points
        bps_df = self.calculate_basis_points(merchant_df, residual_df)
        
        # Add BPS to residual DataFrame
        residual_with_bps = pd.merge(
            residual_df,
            bps_df[['mid', 'bps']],
            on='mid',
            how='left'
        )
        residual_with_bps['bps'] = residual_with_bps['bps'].fillna(0)
        
        # Calculate office fees
        residual_with_fees = self.calculate_office_fees(residual_with_bps)
        
        # Calculate equipment recovery
        residual_final = self.calculate_equipment_recovery(residual_with_fees, equipment_balances)
        
        # Apply agent splits
        agent_earnings = self.apply_agent_splits(residual_final, agent_splits)
        
        # Return all processed DataFrames
        return {
            "residual_final": residual_final,
            "agent_earnings": agent_earnings,
            "bps_data": bps_df
        }
    
    def load_equipment_balances(self, file_path: str) -> Dict[str, float]:
        """
        Load equipment balances from a CSV file.
        
        Args:
            file_path: Path to CSV file with equipment balances
            
        Returns:
            Dictionary mapping merchant IDs to equipment balances
        """
        try:
            df = pd.read_csv(file_path)
            # Ensure required columns exist
            if 'mid' not in df.columns or 'balance' not in df.columns:
                logger.error(f"Equipment balance file {file_path} missing required columns")
                return {}
            
            # Convert to dictionary
            balances = dict(zip(df['mid'], df['balance']))
            logger.info(f"Loaded {len(balances)} equipment balances from {file_path}")
            return balances
            
        except Exception as e:
            logger.error(f"Error loading equipment balances from {file_path}: {str(e)}")
            return {}
    
    def load_agent_splits(self, file_path: str) -> Dict[str, Dict[str, float]]:
        """
        Load agent splits from a CSV file.
        
        Args:
            file_path: Path to CSV file with agent splits
            
        Returns:
            Dictionary mapping merchant IDs to dictionaries of agent names and split percentages
        """
        try:
            df = pd.read_csv(file_path)
            # Ensure required columns exist
            if 'mid' not in df.columns or 'agent_name' not in df.columns or 'split_percentage' not in df.columns:
                logger.error(f"Agent splits file {file_path} missing required columns")
                return {}
            
            # Convert to dictionary
            splits = {}
            for _, row in df.iterrows():
                mid = row['mid']
                agent_name = row['agent_name']
                split_percentage = row['split_percentage']
                
                if mid not in splits:
                    splits[mid] = {}
                
                splits[mid][agent_name] = split_percentage
            
            logger.info(f"Loaded agent splits for {len(splits)} merchants from {file_path}")
            return splits
            
        except Exception as e:
            logger.error(f"Error loading agent splits from {file_path}: {str(e)}")
            return {}
