"""
Dashboard preparation module for generating data for frontend dashboards.
"""
import logging
import json
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path

from irelandpay_analytics.config import settings

logger = logging.getLogger(__name__)

class DashboardPrep:
    """Prepares data for frontend dashboards."""
    
    def __init__(self, output_dir: Optional[Path] = None):
        """
        Initialize the dashboard preparation module.
        
        Args:
            output_dir: Directory to save JSON files (defaults to settings.PROCESSED_DATA_DIR / "dashboard")
        """
        self.output_dir = output_dir or (settings.PROCESSED_DATA_DIR / "dashboard")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Initialized DashboardPrep with output directory: {self.output_dir}")
    
    def generate_top_merchants_json(self, merchant_df: pd.DataFrame, top_n: int = 25) -> str:
        """
        Generate JSON file with top merchants by volume.
        
        Args:
            merchant_df: DataFrame with merchant data
            top_n: Number of top merchants to include
            
        Returns:
            Path to the generated JSON file
        """
        logger.info(f"Generating top {top_n} merchants JSON")
        
        # Sort by volume and get top N merchants
        top_merchants = merchant_df.sort_values('total_volume', ascending=False).head(top_n)
        
        # Convert to list of dictionaries
        merchants_list = []
        for _, row in top_merchants.iterrows():
            merchant_dict = {
                'mid': row.get('mid', ''),
                'merchant_dba': row.get('merchant_dba', 'Unknown'),
                'total_volume': float(row.get('total_volume', 0)),
                'total_txns': int(row.get('total_txns', 0)),
            }
            
            # Add optional fields if they exist
            if 'net_profit' in row:
                merchant_dict['net_profit'] = float(row.get('net_profit', 0))
            
            if 'bps' in row:
                merchant_dict['bps'] = float(row.get('bps', 0))
            
            if 'profit_margin' in row:
                merchant_dict['profit_margin'] = float(row.get('profit_margin', 0))
            
            merchants_list.append(merchant_dict)
        
        # Create output data
        output_data = {
            'merchants': merchants_list,
            'generated_at': datetime.now().isoformat(),
            'count': len(merchants_list)
        }
        
        # Save to JSON file
        filename = f"top_{top_n}_merchants.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        logger.info(f"Top merchants JSON saved to {filepath}")
        return str(filepath)
    
    def generate_top_agents_json(self, agent_df: pd.DataFrame, top_n: int = 25) -> str:
        """
        Generate JSON file with top agents by earnings.
        
        Args:
            agent_df: DataFrame with agent data
            top_n: Number of top agents to include
            
        Returns:
            Path to the generated JSON file
        """
        logger.info(f"Generating top {top_n} agents JSON")
        
        # Sort by earnings and get top N agents
        top_agents = agent_df.sort_values('total_earnings', ascending=False).head(top_n)
        
        # Convert to list of dictionaries
        agents_list = []
        for _, row in top_agents.iterrows():
            agent_dict = {
                'agent_name': row.get('agent_name', 'Unknown'),
                'merchant_count': int(row.get('merchant_count', 0)),
                'total_earnings': float(row.get('total_earnings', 0)),
            }
            
            # Add optional fields if they exist
            if 'total_volume' in row:
                agent_dict['total_volume'] = float(row.get('total_volume', 0))
            
            if 'effective_bps' in row:
                agent_dict['effective_bps'] = float(row.get('effective_bps', 0))
            
            agents_list.append(agent_dict)
        
        # Create output data
        output_data = {
            'agents': agents_list,
            'generated_at': datetime.now().isoformat(),
            'count': len(agents_list)
        }
        
        # Save to JSON file
        filename = f"top_{top_n}_agents.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        logger.info(f"Top agents JSON saved to {filepath}")
        return str(filepath)
    
    def generate_volume_trend_json(self, trend_df: pd.DataFrame) -> str:
        """
        Generate JSON file with volume trend data.
        
        Args:
            trend_df: DataFrame with volume trend data
            
        Returns:
            Path to the generated JSON file
        """
        logger.info("Generating volume trend JSON")
        
        # Convert to list of dictionaries
        trend_list = []
        for _, row in trend_df.iterrows():
            trend_dict = {
                'month': row.get('month', ''),
                'total_volume': float(row.get('total_volume', 0)),
                'total_txns': int(row.get('total_txns', 0)),
                'merchant_count': int(row.get('merchant_count', 0)),
            }
            
            # Add optional fields if they exist
            if 'volume_change_pct' in row:
                trend_dict['volume_change_pct'] = float(row.get('volume_change_pct', 0))
            
            if 'txns_change_pct' in row:
                trend_dict['txns_change_pct'] = float(row.get('txns_change_pct', 0))
            
            if 'is_forecast' in row:
                trend_dict['is_forecast'] = bool(row.get('is_forecast', False))
            
            trend_list.append(trend_dict)
        
        # Create output data
        output_data = {
            'trend': trend_list,
            'generated_at': datetime.now().isoformat(),
            'count': len(trend_list)
        }
        
        # Save to JSON file
        filename = "volume_trend.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        logger.info(f"Volume trend JSON saved to {filepath}")
        return str(filepath)
    
    def generate_agent_merchants_json(self, agent_name: str, merchant_df: pd.DataFrame) -> str:
        """
        Generate JSON file with merchants for a specific agent.
        
        Args:
            agent_name: Name of the agent
            merchant_df: DataFrame with merchant data for this agent
            
        Returns:
            Path to the generated JSON file
        """
        logger.info(f"Generating merchants JSON for agent {agent_name}")
        
        # Sort by volume
        merchants = merchant_df.sort_values('total_volume', ascending=False)
        
        # Convert to list of dictionaries
        merchants_list = []
        for _, row in merchants.iterrows():
            merchant_dict = {
                'mid': row.get('mid', ''),
                'merchant_dba': row.get('merchant_dba', 'Unknown'),
                'total_volume': float(row.get('total_volume', 0)),
                'total_txns': int(row.get('total_txns', 0)),
            }
            
            # Add optional fields if they exist
            if 'net_profit' in row:
                merchant_dict['net_profit'] = float(row.get('net_profit', 0))
            
            if 'bps' in row:
                merchant_dict['bps'] = float(row.get('bps', 0))
            
            if 'earnings' in row:
                merchant_dict['earnings'] = float(row.get('earnings', 0))
            
            merchants_list.append(merchant_dict)
        
        # Create output data
        output_data = {
            'agent_name': agent_name,
            'merchants': merchants_list,
            'generated_at': datetime.now().isoformat(),
            'count': len(merchants_list)
        }
        
        # Save to JSON file
        filename = f"agent_{agent_name.replace(' ', '_')}_merchants.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        logger.info(f"Agent merchants JSON saved to {filepath}")
        return str(filepath)
    
    def generate_monthly_summary_json(self, month: str, summary_data: Dict[str, Any]) -> str:
        """
        Generate JSON file with monthly summary data.
        
        Args:
            month: Month in format YYYY-MM
            summary_data: Dictionary with summary statistics
            
        Returns:
            Path to the generated JSON file
        """
        logger.info(f"Generating monthly summary JSON for {month}")
        
        # Create output data
        output_data = {
            'month': month,
            'summary': summary_data,
            'generated_at': datetime.now().isoformat()
        }
        
        # Save to JSON file
        filename = f"monthly_summary_{month}.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        logger.info(f"Monthly summary JSON saved to {filepath}")
        return str(filepath)
    
    def generate_agent_dashboard_data(self, agent_name: str, agent_data: Dict[str, Any],
                                    merchant_data: pd.DataFrame, trend_data: pd.DataFrame) -> str:
        """
        Generate JSON file with all data needed for the agent dashboard.
        
        Args:
            agent_name: Name of the agent
            agent_data: Dictionary with agent summary data
            merchant_data: DataFrame with merchant data for this agent
            trend_data: DataFrame with trend data for this agent
            
        Returns:
            Path to the generated JSON file
        """
        logger.info(f"Generating dashboard data for agent {agent_name}")
        
        # Convert merchant data to list of dictionaries
        merchants_list = []
        for _, row in merchant_data.sort_values('total_volume', ascending=False).iterrows():
            merchant_dict = {
                'mid': row.get('mid', ''),
                'merchant_dba': row.get('merchant_dba', 'Unknown'),
                'total_volume': float(row.get('total_volume', 0)),
                'total_txns': int(row.get('total_txns', 0)),
                'net_profit': float(row.get('net_profit', 0)) if 'net_profit' in row else 0,
                'bps': float(row.get('bps', 0)) if 'bps' in row else 0,
                'earnings': float(row.get('earnings', 0)) if 'earnings' in row else 0
            }
            merchants_list.append(merchant_dict)
        
        # Convert trend data to list of dictionaries
        trend_list = []
        for _, row in trend_data.sort_values('month').iterrows():
            trend_dict = {
                'month': row.get('month', ''),
                'total_volume': float(row.get('total_volume', 0)) if 'total_volume' in row else 0,
                'total_earnings': float(row.get('total_earnings', 0)) if 'total_earnings' in row else 0,
                'merchant_count': int(row.get('merchant_count', 0)) if 'merchant_count' in row else 0
            }
            trend_list.append(trend_dict)
        
        # Create output data
        output_data = {
            'agent_name': agent_name,
            'summary': agent_data,
            'merchants': merchants_list,
            'trend': trend_list,
            'generated_at': datetime.now().isoformat()
        }
        
        # Save to JSON file
        filename = f"agent_dashboard_{agent_name.replace(' ', '_')}.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        logger.info(f"Agent dashboard data saved to {filepath}")
        return str(filepath)
    
    def generate_admin_dashboard_data(self, agents_df: pd.DataFrame, 
                                    volume_trend: pd.DataFrame,
                                    profit_trend: pd.DataFrame) -> str:
        """
        Generate JSON file with all data needed for the admin dashboard.
        
        Args:
            agents_df: DataFrame with agent data
            volume_trend: DataFrame with volume trend data
            profit_trend: DataFrame with profit trend data
            
        Returns:
            Path to the generated JSON file
        """
        logger.info("Generating admin dashboard data")
        
        # Convert agent data to list of dictionaries
        agents_list = []
        for _, row in agents_df.sort_values('total_earnings', ascending=False).iterrows():
            agent_dict = {
                'agent_name': row.get('agent_name', 'Unknown'),
                'merchant_count': int(row.get('merchant_count', 0)),
                'total_earnings': float(row.get('total_earnings', 0)),
                'total_volume': float(row.get('total_volume', 0)) if 'total_volume' in row else 0,
                'effective_bps': float(row.get('effective_bps', 0)) if 'effective_bps' in row else 0
            }
            agents_list.append(agent_dict)
        
        # Convert volume trend data to list of dictionaries
        volume_list = []
        for _, row in volume_trend.sort_values('month').iterrows():
            volume_dict = {
                'month': row.get('month', ''),
                'total_volume': float(row.get('total_volume', 0)),
                'merchant_count': int(row.get('merchant_count', 0))
            }
            volume_list.append(volume_dict)
        
        # Convert profit trend data to list of dictionaries
        profit_list = []
        for _, row in profit_trend.sort_values('month').iterrows():
            profit_dict = {
                'month': row.get('month', ''),
                'total_profit': float(row.get('total_profit', 0))
            }
            profit_list.append(profit_dict)
        
        # Calculate summary statistics
        total_volume = sum(item['total_volume'] for item in volume_list[-1:]) if volume_list else 0
        total_profit = sum(item['total_profit'] for item in profit_list[-1:]) if profit_list else 0
        total_merchants = volume_list[-1]['merchant_count'] if volume_list else 0
        total_agents = len(agents_list)
        
        # Create output data
        output_data = {
            'summary': {
                'total_volume': total_volume,
                'total_profit': total_profit,
                'total_merchants': total_merchants,
                'total_agents': total_agents
            },
            'agents': agents_list,
            'volume_trend': volume_list,
            'profit_trend': profit_list,
            'generated_at': datetime.now().isoformat()
        }
        
        # Save to JSON file
        filename = "admin_dashboard.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        logger.info(f"Admin dashboard data saved to {filepath}")
        return str(filepath)
