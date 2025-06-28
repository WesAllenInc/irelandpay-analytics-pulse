"""
Merchant summary module for analyzing merchant performance.
"""
import logging
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

class MerchantSummaryAnalyzer:
    """Analyzes merchant performance and generates summaries."""
    
    def __init__(self):
        """Initialize the merchant summary analyzer."""
        logger.info("Initialized MerchantSummaryAnalyzer")
    
    def calculate_merchant_summary(self, merchant_df: pd.DataFrame, 
                                  residual_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate summary statistics for each merchant.
        
        Args:
            merchant_df: DataFrame with merchant data
            residual_df: DataFrame with residual data
            
        Returns:
            DataFrame with merchant summary statistics
        """
        # Check if we have data
        if merchant_df.empty:
            logger.warning("Empty merchant DataFrame")
            return pd.DataFrame()
        
        # Merge merchant and residual data
        if not residual_df.empty:
            merged_df = pd.merge(
                merchant_df,
                residual_df[['mid', 'net_profit', 'bps', 'payout_month']],
                on='mid',
                how='left'
            )
            # Fill missing values
            merged_df['net_profit'] = merged_df['net_profit'].fillna(0)
            merged_df['bps'] = merged_df['bps'].fillna(0)
        else:
            merged_df = merchant_df.copy()
            merged_df['net_profit'] = 0
            merged_df['bps'] = 0
            merged_df['payout_month'] = None
        
        # Calculate profit margin
        merged_df['profit_margin'] = np.where(
            merged_df['total_volume'] > 0,
            merged_df['net_profit'] / merged_df['total_volume'] * 100,
            0
        )
        
        # Calculate average transaction size
        merged_df['avg_txn_size'] = np.where(
            merged_df['total_txns'] > 0,
            merged_df['total_volume'] / merged_df['total_txns'],
            0
        )
        
        logger.info(f"Generated summary for {len(merged_df)} merchants")
        return merged_df
    
    def calculate_monthly_trend(self, merchant_dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        Calculate monthly trends for merchants.
        
        Args:
            merchant_dfs: Dictionary mapping months to merchant DataFrames
            
        Returns:
            DataFrame with monthly merchant trends
        """
        # Check if we have data
        if not merchant_dfs:
            logger.warning("No merchant data provided")
            return pd.DataFrame()
        
        # Create a list to store monthly summaries
        monthly_summaries = []
        
        # Process each month
        for month, df in merchant_dfs.items():
            # Add month column
            df_copy = df.copy()
            df_copy['month'] = month
            
            # Select relevant columns
            columns = ['mid', 'merchant_dba', 'total_volume', 'total_txns', 'net_profit', 'month']
            df_subset = df_copy[columns] if all(col in df_copy.columns for col in columns) else df_copy
            
            monthly_summaries.append(df_subset)
        
        # Combine all monthly summaries
        if monthly_summaries:
            combined_df = pd.concat(monthly_summaries, ignore_index=True)
            logger.info(f"Generated monthly trends for {combined_df['mid'].nunique()} merchants across {len(merchant_dfs)} months")
            return combined_df
        else:
            logger.warning("No monthly summaries generated")
            return pd.DataFrame()
    
    def calculate_month_over_month_change(self, monthly_trend_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate month-over-month changes for merchants.
        
        Args:
            monthly_trend_df: DataFrame with monthly merchant trends
            
        Returns:
            DataFrame with month-over-month changes
        """
        # Check if we have data
        if monthly_trend_df.empty:
            logger.warning("Empty monthly trend DataFrame")
            return pd.DataFrame()
        
        # Sort by merchant and month
        monthly_trend_df = monthly_trend_df.sort_values(['mid', 'month'])
        
        # Calculate month-over-month changes
        monthly_trend_df['prev_volume'] = monthly_trend_df.groupby('mid')['total_volume'].shift(1)
        monthly_trend_df['prev_txns'] = monthly_trend_df.groupby('mid')['total_txns'].shift(1)
        monthly_trend_df['prev_profit'] = monthly_trend_df.groupby('mid')['net_profit'].shift(1)
        
        # Calculate percentage changes
        monthly_trend_df['volume_change_pct'] = np.where(
            monthly_trend_df['prev_volume'] > 0,
            (monthly_trend_df['total_volume'] - monthly_trend_df['prev_volume']) / monthly_trend_df['prev_volume'] * 100,
            0
        )
        
        monthly_trend_df['txns_change_pct'] = np.where(
            monthly_trend_df['prev_txns'] > 0,
            (monthly_trend_df['total_txns'] - monthly_trend_df['prev_txns']) / monthly_trend_df['prev_txns'] * 100,
            0
        )
        
        monthly_trend_df['profit_change_pct'] = np.where(
            monthly_trend_df['prev_profit'] > 0,
            (monthly_trend_df['net_profit'] - monthly_trend_df['prev_profit']) / monthly_trend_df['prev_profit'] * 100,
            0
        )
        
        logger.info("Calculated month-over-month changes")
        return monthly_trend_df
    
    def identify_top_merchants(self, merchant_summary_df: pd.DataFrame, 
                              metric: str = 'total_volume', 
                              top_n: int = 25) -> pd.DataFrame:
        """
        Identify top performing merchants based on a metric.
        
        Args:
            merchant_summary_df: DataFrame with merchant summary statistics
            metric: Metric to sort by ('total_volume', 'net_profit', 'profit_margin')
            top_n: Number of top merchants to identify
            
        Returns:
            DataFrame with top merchants
        """
        # Check if we have data
        if merchant_summary_df.empty:
            logger.warning("Empty merchant summary DataFrame")
            return pd.DataFrame()
        
        # Check if metric exists
        if metric not in merchant_summary_df.columns:
            logger.warning(f"Metric {metric} not found in merchant summary DataFrame")
            return pd.DataFrame()
        
        # Sort by metric
        top_merchants = merchant_summary_df.sort_values(metric, ascending=False).head(top_n)
        
        logger.info(f"Identified top {len(top_merchants)} merchants by {metric}")
        return top_merchants
    
    def identify_outliers(self, merchant_summary_df: pd.DataFrame, 
                         metric: str = 'profit_margin', 
                         std_dev_threshold: float = 2.0) -> pd.DataFrame:
        """
        Identify outlier merchants based on a metric.
        
        Args:
            merchant_summary_df: DataFrame with merchant summary statistics
            metric: Metric to identify outliers ('total_volume', 'net_profit', 'profit_margin')
            std_dev_threshold: Number of standard deviations to consider as outlier
            
        Returns:
            DataFrame with outlier merchants
        """
        # Check if we have data
        if merchant_summary_df.empty:
            logger.warning("Empty merchant summary DataFrame")
            return pd.DataFrame()
        
        # Check if metric exists
        if metric not in merchant_summary_df.columns:
            logger.warning(f"Metric {metric} not found in merchant summary DataFrame")
            return pd.DataFrame()
        
        # Calculate mean and standard deviation
        mean_value = merchant_summary_df[metric].mean()
        std_value = merchant_summary_df[metric].std()
        
        # Identify outliers
        outliers = merchant_summary_df[
            (merchant_summary_df[metric] > mean_value + std_dev_threshold * std_value) |
            (merchant_summary_df[metric] < mean_value - std_dev_threshold * std_value)
        ]
        
        logger.info(f"Identified {len(outliers)} outlier merchants by {metric}")
        return outliers
    
    def generate_merchant_report(self, mid: str, merchant_df: pd.DataFrame,
                               residual_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate a detailed report for a specific merchant.
        
        Args:
            mid: Merchant ID
            merchant_df: DataFrame with merchant data
            residual_df: DataFrame with residual data
            
        Returns:
            Dictionary with merchant report data
        """
        # Filter data for this merchant
        merchant_data = merchant_df[merchant_df['mid'] == mid]
        
        if merchant_data.empty:
            logger.warning(f"No data found for merchant {mid}")
            return {}
        
        # Get the first row (should be only one)
        merchant_row = merchant_data.iloc[0]
        
        # Filter residual data for this merchant
        residual_data = residual_df[residual_df['mid'] == mid] if not residual_df.empty else pd.DataFrame()
        
        # Calculate summary statistics
        merchant_dba = merchant_row['merchant_dba'] if 'merchant_dba' in merchant_row else 'Unknown'
        total_volume = merchant_row['total_volume']
        total_txns = merchant_row['total_txns']
        
        # Get residual data if available
        net_profit = residual_data['net_profit'].sum() if not residual_data.empty else 0
        bps = residual_data['bps'].iloc[0] if not residual_data.empty and 'bps' in residual_data.columns else 0
        
        # Calculate additional metrics
        avg_txn_size = total_volume / total_txns if total_txns > 0 else 0
        profit_margin = (net_profit / total_volume) * 100 if total_volume > 0 else 0
        
        # Create the report
        report = {
            'mid': mid,
            'merchant_dba': merchant_dba,
            'total_volume': total_volume,
            'total_txns': total_txns,
            'net_profit': net_profit,
            'bps': bps,
            'avg_txn_size': avg_txn_size,
            'profit_margin': profit_margin,
            'month': merchant_row['month'] if 'month' in merchant_row else None
        }
        
        logger.info(f"Generated report for merchant {mid}")
        return report
