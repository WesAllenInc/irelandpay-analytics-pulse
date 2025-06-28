"""
Trend tracker module for analyzing trends over time.
"""
import logging
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

class TrendTracker:
    """Tracks and analyzes trends over time."""
    
    def __init__(self):
        """Initialize the trend tracker."""
        logger.info("Initialized TrendTracker")
    
    def calculate_volume_trends(self, merchant_dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        Calculate volume trends over time.
        
        Args:
            merchant_dfs: Dictionary mapping months to merchant DataFrames
            
        Returns:
            DataFrame with volume trends
        """
        # Check if we have data
        if not merchant_dfs:
            logger.warning("No merchant data provided")
            return pd.DataFrame()
        
        # Create a list to store monthly volumes
        monthly_volumes = []
        
        # Process each month
        for month, df in merchant_dfs.items():
            # Calculate total volume for the month
            total_volume = df['total_volume'].sum() if 'total_volume' in df.columns else 0
            total_txns = df['total_txns'].sum() if 'total_txns' in df.columns else 0
            merchant_count = df['mid'].nunique() if 'mid' in df.columns else 0
            
            monthly_volumes.append({
                'month': month,
                'total_volume': total_volume,
                'total_txns': total_txns,
                'merchant_count': merchant_count
            })
        
        # Convert to DataFrame
        if monthly_volumes:
            volumes_df = pd.DataFrame(monthly_volumes)
            # Sort by month
            volumes_df = volumes_df.sort_values('month')
            
            # Calculate month-over-month changes
            volumes_df['prev_volume'] = volumes_df['total_volume'].shift(1)
            volumes_df['volume_change_pct'] = np.where(
                volumes_df['prev_volume'] > 0,
                (volumes_df['total_volume'] - volumes_df['prev_volume']) / volumes_df['prev_volume'] * 100,
                0
            )
            
            volumes_df['prev_txns'] = volumes_df['total_txns'].shift(1)
            volumes_df['txns_change_pct'] = np.where(
                volumes_df['prev_txns'] > 0,
                (volumes_df['total_txns'] - volumes_df['prev_txns']) / volumes_df['prev_txns'] * 100,
                0
            )
            
            volumes_df['prev_merchant_count'] = volumes_df['merchant_count'].shift(1)
            volumes_df['merchant_count_change'] = volumes_df['merchant_count'] - volumes_df['prev_merchant_count']
            
            logger.info(f"Calculated volume trends for {len(volumes_df)} months")
            return volumes_df
        else:
            logger.warning("No volume trends generated")
            return pd.DataFrame()
    
    def calculate_profit_trends(self, residual_dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        Calculate profit trends over time.
        
        Args:
            residual_dfs: Dictionary mapping months to residual DataFrames
            
        Returns:
            DataFrame with profit trends
        """
        # Check if we have data
        if not residual_dfs:
            logger.warning("No residual data provided")
            return pd.DataFrame()
        
        # Create a list to store monthly profits
        monthly_profits = []
        
        # Process each month
        for month, df in residual_dfs.items():
            # Calculate total profit for the month
            total_profit = df['net_profit'].sum() if 'net_profit' in df.columns else 0
            merchant_count = df['mid'].nunique() if 'mid' in df.columns else 0
            
            monthly_profits.append({
                'month': month,
                'total_profit': total_profit,
                'merchant_count': merchant_count,
                'avg_profit_per_merchant': total_profit / merchant_count if merchant_count > 0 else 0
            })
        
        # Convert to DataFrame
        if monthly_profits:
            profits_df = pd.DataFrame(monthly_profits)
            # Sort by month
            profits_df = profits_df.sort_values('month')
            
            # Calculate month-over-month changes
            profits_df['prev_profit'] = profits_df['total_profit'].shift(1)
            profits_df['profit_change_pct'] = np.where(
                profits_df['prev_profit'] > 0,
                (profits_df['total_profit'] - profits_df['prev_profit']) / profits_df['prev_profit'] * 100,
                0
            )
            
            logger.info(f"Calculated profit trends for {len(profits_df)} months")
            return profits_df
        else:
            logger.warning("No profit trends generated")
            return pd.DataFrame()
    
    def calculate_merchant_retention(self, merchant_dfs: Dict[str, pd.DataFrame]) -> Tuple[pd.DataFrame, float]:
        """
        Calculate merchant retention over time.
        
        Args:
            merchant_dfs: Dictionary mapping months to merchant DataFrames
            
        Returns:
            Tuple of (DataFrame with retention metrics, overall retention rate)
        """
        # Check if we have data
        if not merchant_dfs or len(merchant_dfs) < 2:
            logger.warning("Insufficient merchant data for retention calculation")
            return pd.DataFrame(), 0.0
        
        # Sort months
        months = sorted(merchant_dfs.keys())
        
        # Create a list to store retention metrics
        retention_metrics = []
        
        # Calculate retention for each pair of consecutive months
        for i in range(1, len(months)):
            prev_month = months[i-1]
            curr_month = months[i]
            
            # Get merchant IDs for each month
            prev_merchants = set(merchant_dfs[prev_month]['mid'])
            curr_merchants = set(merchant_dfs[curr_month]['mid'])
            
            # Calculate retention metrics
            retained = len(prev_merchants.intersection(curr_merchants))
            lost = len(prev_merchants - curr_merchants)
            new = len(curr_merchants - prev_merchants)
            
            retention_rate = retained / len(prev_merchants) * 100 if prev_merchants else 0
            
            retention_metrics.append({
                'prev_month': prev_month,
                'curr_month': curr_month,
                'retained_merchants': retained,
                'lost_merchants': lost,
                'new_merchants': new,
                'retention_rate': retention_rate
            })
        
        # Convert to DataFrame
        if retention_metrics:
            retention_df = pd.DataFrame(retention_metrics)
            
            # Calculate overall retention rate
            overall_retention = retention_df['retention_rate'].mean()
            
            logger.info(f"Calculated merchant retention across {len(retention_df)} month pairs")
            return retention_df, overall_retention
        else:
            logger.warning("No retention metrics generated")
            return pd.DataFrame(), 0.0
    
    def forecast_future_months(self, trend_df: pd.DataFrame, months_to_forecast: int = 3) -> pd.DataFrame:
        """
        Forecast future months based on historical trends.
        
        Args:
            trend_df: DataFrame with historical trends
            months_to_forecast: Number of months to forecast
            
        Returns:
            DataFrame with forecasted values
        """
        # Check if we have data
        if trend_df.empty or len(trend_df) < 3:
            logger.warning("Insufficient data for forecasting")
            return pd.DataFrame()
        
        # Create a copy of the trend DataFrame
        df = trend_df.copy()
        
        # Sort by month
        df = df.sort_values('month')
        
        # Get the last month
        last_month = df['month'].iloc[-1]
        
        # Parse the last month to get year and month
        try:
            year, month = map(int, last_month.split('-'))
        except:
            logger.error(f"Could not parse month format: {last_month}")
            return pd.DataFrame()
        
        # Calculate average growth rates
        if 'volume_change_pct' in df.columns:
            avg_volume_growth = df['volume_change_pct'].mean()
        else:
            avg_volume_growth = 0
            
        if 'profit_change_pct' in df.columns:
            avg_profit_growth = df['profit_change_pct'].mean()
        else:
            avg_profit_growth = 0
            
        if 'txns_change_pct' in df.columns:
            avg_txns_growth = df['txns_change_pct'].mean()
        else:
            avg_txns_growth = 0
        
        # Get the last values
        last_values = df.iloc[-1].to_dict()
        
        # Create forecasts
        forecasts = []
        
        for i in range(1, months_to_forecast + 1):
            # Calculate next month
            month += 1
            if month > 12:
                month = 1
                year += 1
            
            forecast_month = f"{year}-{month:02d}"
            
            # Calculate forecasted values
            forecast = {
                'month': forecast_month,
                'is_forecast': True
            }
            
            if 'total_volume' in last_values:
                forecast['total_volume'] = last_values['total_volume'] * (1 + avg_volume_growth / 100) ** i
                
            if 'total_profit' in last_values:
                forecast['total_profit'] = last_values['total_profit'] * (1 + avg_profit_growth / 100) ** i
                
            if 'total_txns' in last_values:
                forecast['total_txns'] = last_values['total_txns'] * (1 + avg_txns_growth / 100) ** i
            
            forecasts.append(forecast)
        
        # Convert to DataFrame
        if forecasts:
            forecast_df = pd.DataFrame(forecasts)
            
            # Add original data with is_forecast = False
            df['is_forecast'] = False
            
            # Combine original and forecast data
            combined_df = pd.concat([df, forecast_df], ignore_index=True)
            
            logger.info(f"Generated forecasts for {len(forecasts)} future months")
            return combined_df
        else:
            logger.warning("No forecasts generated")
            return df
    
    def identify_seasonal_patterns(self, trend_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Identify seasonal patterns in the data.
        
        Args:
            trend_df: DataFrame with historical trends
            
        Returns:
            Dictionary with identified seasonal patterns
        """
        # Check if we have data
        if trend_df.empty or len(trend_df) < 12:
            logger.warning("Insufficient data for seasonal pattern identification")
            return {}
        
        # Create a copy of the trend DataFrame
        df = trend_df.copy()
        
        # Sort by month
        df = df.sort_values('month')
        
        # Extract month number from month string
        df['month_num'] = df['month'].apply(lambda x: int(x.split('-')[1]))
        
        # Group by month number and calculate average values
        monthly_averages = df.groupby('month_num').agg({
            'total_volume': 'mean',
            'total_profit': 'mean' if 'total_profit' in df.columns else 'count',
            'total_txns': 'mean' if 'total_txns' in df.columns else 'count'
        }).reset_index()
        
        # Identify peak months
        peak_volume_month = monthly_averages.loc[monthly_averages['total_volume'].idxmax(), 'month_num']
        
        if 'total_profit' in monthly_averages.columns:
            peak_profit_month = monthly_averages.loc[monthly_averages['total_profit'].idxmax(), 'month_num']
        else:
            peak_profit_month = None
            
        if 'total_txns' in monthly_averages.columns:
            peak_txns_month = monthly_averages.loc[monthly_averages['total_txns'].idxmax(), 'month_num']
        else:
            peak_txns_month = None
        
        # Calculate month-to-month volatility
        if len(df) > 1:
            volume_volatility = df['volume_change_pct'].std() if 'volume_change_pct' in df.columns else None
            profit_volatility = df['profit_change_pct'].std() if 'profit_change_pct' in df.columns else None
        else:
            volume_volatility = None
            profit_volatility = None
        
        # Create the result
        result = {
            'peak_volume_month': peak_volume_month,
            'peak_profit_month': peak_profit_month,
            'peak_txns_month': peak_txns_month,
            'volume_volatility': volume_volatility,
            'profit_volatility': profit_volatility,
            'monthly_averages': monthly_averages.to_dict(orient='records')
        }
        
        logger.info("Identified seasonal patterns")
        return result
