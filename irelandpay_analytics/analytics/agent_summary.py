"""
Agent summary module for analyzing agent performance.
"""
import logging
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

class AgentSummaryAnalyzer:
    """Analyzes agent performance and generates summaries."""
    
    def __init__(self):
        """Initialize the agent summary analyzer."""
        logger.info("Initialized AgentSummaryAnalyzer")
    
    def calculate_agent_summary(self, agent_earnings_df: pd.DataFrame, 
                               merchant_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate summary statistics for each agent.
        
        Args:
            agent_earnings_df: DataFrame with agent earnings
            merchant_df: DataFrame with merchant data
            
        Returns:
            DataFrame with agent summary statistics
        """
        # Check if we have data
        if agent_earnings_df.empty:
            logger.warning("Empty agent earnings DataFrame")
            return pd.DataFrame()
        
        # Group by agent and calculate total earnings
        agent_summary = agent_earnings_df.groupby('agent_name').agg({
            'earnings': 'sum',
            'mid': 'nunique'
        }).reset_index()
        
        # Rename columns
        agent_summary = agent_summary.rename(columns={
            'earnings': 'total_earnings',
            'mid': 'merchant_count'
        })
        
        # Add month
        if 'payout_month' in agent_earnings_df.columns:
            # Get the most common month
            month = agent_earnings_df['payout_month'].mode().iloc[0]
            agent_summary['month'] = month
        
        # Calculate total volume for each agent
        if not merchant_df.empty:
            # Get the merchant IDs for each agent
            agent_merchants = {}
            for agent_name in agent_summary['agent_name']:
                agent_mids = agent_earnings_df[agent_earnings_df['agent_name'] == agent_name]['mid'].unique()
                agent_merchants[agent_name] = agent_mids
            
            # Calculate total volume for each agent
            agent_volumes = []
            for agent_name, mids in agent_merchants.items():
                # Filter merchant DataFrame for this agent's merchants
                agent_merchant_df = merchant_df[merchant_df['mid'].isin(mids)]
                total_volume = agent_merchant_df['total_volume'].sum()
                agent_volumes.append({
                    'agent_name': agent_name,
                    'total_volume': total_volume
                })
            
            # Convert to DataFrame and merge
            if agent_volumes:
                volumes_df = pd.DataFrame(agent_volumes)
                agent_summary = pd.merge(
                    agent_summary,
                    volumes_df,
                    on='agent_name',
                    how='left'
                )
                agent_summary['total_volume'] = agent_summary['total_volume'].fillna(0)
        
        # Calculate effective BPS
        if 'total_volume' in agent_summary.columns and 'total_earnings' in agent_summary.columns:
            agent_summary['effective_bps'] = np.where(
                agent_summary['total_volume'] > 0,
                (agent_summary['total_earnings'] / agent_summary['total_volume']) * 10000,
                0
            )
        
        logger.info(f"Generated summary for {len(agent_summary)} agents")
        return agent_summary
    
    def calculate_monthly_trend(self, agent_earnings_dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        Calculate monthly trends for agents.
        
        Args:
            agent_earnings_dfs: Dictionary mapping months to agent earnings DataFrames
            
        Returns:
            DataFrame with monthly agent trends
        """
        # Check if we have data
        if not agent_earnings_dfs:
            logger.warning("No agent earnings data provided")
            return pd.DataFrame()
        
        # Create a list to store monthly summaries
        monthly_summaries = []
        
        # Process each month
        for month, df in agent_earnings_dfs.items():
            # Group by agent and calculate total earnings
            month_summary = df.groupby('agent_name').agg({
                'earnings': 'sum',
                'mid': 'nunique'
            }).reset_index()
            
            # Add month column
            month_summary['month'] = month
            
            # Rename columns
            month_summary = month_summary.rename(columns={
                'earnings': 'total_earnings',
                'mid': 'merchant_count'
            })
            
            monthly_summaries.append(month_summary)
        
        # Combine all monthly summaries
        if monthly_summaries:
            combined_df = pd.concat(monthly_summaries, ignore_index=True)
            logger.info(f"Generated monthly trends for {combined_df['agent_name'].nunique()} agents across {len(agent_earnings_dfs)} months")
            return combined_df
        else:
            logger.warning("No monthly summaries generated")
            return pd.DataFrame()
    
    def calculate_month_over_month_change(self, monthly_trend_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate month-over-month changes for agents.
        
        Args:
            monthly_trend_df: DataFrame with monthly agent trends
            
        Returns:
            DataFrame with month-over-month changes
        """
        # Check if we have data
        if monthly_trend_df.empty:
            logger.warning("Empty monthly trend DataFrame")
            return pd.DataFrame()
        
        # Sort by agent and month
        monthly_trend_df = monthly_trend_df.sort_values(['agent_name', 'month'])
        
        # Calculate month-over-month changes
        monthly_trend_df['prev_earnings'] = monthly_trend_df.groupby('agent_name')['total_earnings'].shift(1)
        monthly_trend_df['prev_merchant_count'] = monthly_trend_df.groupby('agent_name')['merchant_count'].shift(1)
        
        # Calculate percentage changes
        monthly_trend_df['earnings_change_pct'] = np.where(
            monthly_trend_df['prev_earnings'] > 0,
            (monthly_trend_df['total_earnings'] - monthly_trend_df['prev_earnings']) / monthly_trend_df['prev_earnings'] * 100,
            0
        )
        
        monthly_trend_df['merchant_count_change'] = monthly_trend_df['merchant_count'] - monthly_trend_df['prev_merchant_count']
        
        logger.info("Calculated month-over-month changes")
        return monthly_trend_df
    
    def identify_top_agents(self, agent_summary_df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
        """
        Identify top performing agents.
        
        Args:
            agent_summary_df: DataFrame with agent summary statistics
            top_n: Number of top agents to identify
            
        Returns:
            DataFrame with top agents
        """
        # Check if we have data
        if agent_summary_df.empty:
            logger.warning("Empty agent summary DataFrame")
            return pd.DataFrame()
        
        # Sort by total earnings
        top_agents = agent_summary_df.sort_values('total_earnings', ascending=False).head(top_n)
        
        logger.info(f"Identified top {len(top_agents)} agents")
        return top_agents
    
    def identify_outliers(self, agent_summary_df: pd.DataFrame, std_dev_threshold: float = 2.0) -> pd.DataFrame:
        """
        Identify outlier agents based on earnings.
        
        Args:
            agent_summary_df: DataFrame with agent summary statistics
            std_dev_threshold: Number of standard deviations to consider as outlier
            
        Returns:
            DataFrame with outlier agents
        """
        # Check if we have data
        if agent_summary_df.empty:
            logger.warning("Empty agent summary DataFrame")
            return pd.DataFrame()
        
        # Calculate mean and standard deviation
        mean_earnings = agent_summary_df['total_earnings'].mean()
        std_earnings = agent_summary_df['total_earnings'].std()
        
        # Identify outliers
        outliers = agent_summary_df[
            (agent_summary_df['total_earnings'] > mean_earnings + std_dev_threshold * std_earnings) |
            (agent_summary_df['total_earnings'] < mean_earnings - std_dev_threshold * std_earnings)
        ]
        
        logger.info(f"Identified {len(outliers)} outlier agents")
        return outliers
    
    def generate_agent_report(self, agent_name: str, agent_earnings_df: pd.DataFrame,
                             merchant_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate a detailed report for a specific agent.
        
        Args:
            agent_name: Name of the agent
            agent_earnings_df: DataFrame with agent earnings
            merchant_df: DataFrame with merchant data
            
        Returns:
            Dictionary with agent report data
        """
        # Filter data for this agent
        agent_data = agent_earnings_df[agent_earnings_df['agent_name'] == agent_name]
        
        if agent_data.empty:
            logger.warning(f"No data found for agent {agent_name}")
            return {}
        
        # Get merchant IDs for this agent
        agent_mids = agent_data['mid'].unique()
        
        # Filter merchant data for this agent's merchants
        agent_merchants = merchant_df[merchant_df['mid'].isin(agent_mids)]
        
        # Calculate summary statistics
        total_earnings = agent_data['earnings'].sum()
        merchant_count = len(agent_mids)
        total_volume = agent_merchants['total_volume'].sum() if not agent_merchants.empty else 0
        
        # Calculate effective BPS
        effective_bps = (total_earnings / total_volume) * 10000 if total_volume > 0 else 0
        
        # Get top merchants by volume
        top_merchants = agent_merchants.sort_values('total_volume', ascending=False).head(5)
        top_merchants_list = []
        for _, row in top_merchants.iterrows():
            # Find the earnings for this merchant
            merchant_earnings = agent_data[agent_data['mid'] == row['mid']]['earnings'].sum()
            
            top_merchants_list.append({
                'mid': row['mid'],
                'merchant_dba': row['merchant_dba'] if 'merchant_dba' in row else 'Unknown',
                'total_volume': row['total_volume'],
                'earnings': merchant_earnings
            })
        
        # Create the report
        report = {
            'agent_name': agent_name,
            'total_earnings': total_earnings,
            'merchant_count': merchant_count,
            'total_volume': total_volume,
            'effective_bps': effective_bps,
            'top_merchants': top_merchants_list,
            'month': agent_data['payout_month'].iloc[0] if 'payout_month' in agent_data.columns else None
        }
        
        logger.info(f"Generated report for agent {agent_name}")
        return report
