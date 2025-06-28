"""
Transformer module for normalizing and transforming raw Excel data.
"""
import logging
import re
from typing import Dict, List, Any, Optional, Union
import pandas as pd
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

class DataTransformer:
    """Transforms and normalizes raw data from Excel files."""
    
    # Standard column mappings for different file types
    MERCHANT_COLUMN_MAPPINGS = {
        # Common variations of merchant columns
        'merchant id': 'mid',
        'merchant_id': 'mid',
        'mid': 'mid',
        'merchant #': 'mid',
        'merchant no': 'mid',
        'merchant no.': 'mid',
        'id': 'mid',
        
        'merchant name': 'merchant_dba',
        'merchant_name': 'merchant_dba',
        'dba': 'merchant_dba',
        'dba name': 'merchant_dba',
        'business name': 'merchant_dba',
        'name': 'merchant_dba',
        
        'volume': 'total_volume',
        'processing volume': 'total_volume',
        'total volume': 'total_volume',
        'monthly volume': 'total_volume',
        'amount': 'total_volume',
        'sales': 'total_volume',
        
        'transactions': 'total_txns',
        'transaction count': 'total_txns',
        'txn count': 'total_txns',
        'txns': 'total_txns',
        'count': 'total_txns',
        'num transactions': 'total_txns',
    }
    
    RESIDUAL_COLUMN_MAPPINGS = {
        # Common variations of residual columns
        'merchant id': 'mid',
        'merchant_id': 'mid',
        'mid': 'mid',
        'merchant #': 'mid',
        'merchant no': 'mid',
        'merchant no.': 'mid',
        'id': 'mid',
        
        'net profit': 'net_profit',
        'profit': 'net_profit',
        'residual': 'net_profit',
        'commission': 'net_profit',
        'net commission': 'net_profit',
        'net residual': 'net_profit',
        'earnings': 'net_profit',
        'agent earnings': 'net_profit',
        'agent commission': 'net_profit',
        
        'basis points': 'bps',
        'bps': 'bps',
        'rate': 'bps',
        'commission rate': 'bps',
        'agent bps': 'bps',
        'agent rate': 'bps',
        
        'agent': 'agent_name',
        'agent name': 'agent_name',
        'rep': 'agent_name',
        'rep name': 'agent_name',
        'sales rep': 'agent_name',
        'sales agent': 'agent_name',
    }
    
    def __init__(self):
        """Initialize the data transformer."""
        logger.info("Initialized DataTransformer")
    
    def normalize_column_names(self, df: pd.DataFrame, file_type: str) -> pd.DataFrame:
        """
        Normalize column names to standard format.
        
        Args:
            df: DataFrame to normalize
            file_type: Type of file ('merchant' or 'residual')
            
        Returns:
            DataFrame with normalized column names
        """
        # Create a copy to avoid modifying the original
        df = df.copy()
        
        # Convert column names to lowercase and strip whitespace
        df.columns = [str(col).lower().strip() for col in df.columns]
        
        # Apply mappings based on file type
        if file_type == 'merchant':
            mapping = self.MERCHANT_COLUMN_MAPPINGS
        else:  # residual
            mapping = self.RESIDUAL_COLUMN_MAPPINGS
        
        # Create a dictionary for renaming
        rename_dict = {}
        for col in df.columns:
            # Check for exact matches
            if col in mapping:
                rename_dict[col] = mapping[col]
                continue
                
            # Check for partial matches
            for key, value in mapping.items():
                if key in col:
                    rename_dict[col] = value
                    break
        
        # Rename columns
        df = df.rename(columns=rename_dict)
        
        logger.info(f"Normalized column names: {list(df.columns)}")
        return df
    
    def clean_merchant_data(self, df: pd.DataFrame, month: str) -> pd.DataFrame:
        """
        Clean and standardize merchant data.
        
        Args:
            df: DataFrame with merchant data
            month: Month in format YYYY-MM
            
        Returns:
            Cleaned DataFrame
        """
        df = df.copy()
        
        # Ensure required columns exist
        required_cols = ['mid', 'merchant_dba', 'total_volume', 'total_txns']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            logger.warning(f"Missing required columns: {missing_cols}")
            # Try to infer missing columns
            if 'mid' not in df.columns and df.shape[1] > 0:
                # Assume first column is merchant ID
                df = df.rename(columns={df.columns[0]: 'mid'})
                logger.info(f"Inferred column {df.columns[0]} as 'mid'")
            
            if 'merchant_dba' not in df.columns and df.shape[1] > 1:
                # Assume second column is merchant name
                df = df.rename(columns={df.columns[1]: 'merchant_dba'})
                logger.info(f"Inferred column {df.columns[1]} as 'merchant_dba'")
        
        # Clean merchant IDs
        if 'mid' in df.columns:
            # Convert to string and strip whitespace
            df['mid'] = df['mid'].astype(str).str.strip()
            
            # Remove any non-alphanumeric characters
            df['mid'] = df['mid'].str.replace(r'[^a-zA-Z0-9]', '', regex=True)
        
        # Clean merchant names
        if 'merchant_dba' in df.columns:
            # Convert to string and strip whitespace
            df['merchant_dba'] = df['merchant_dba'].astype(str).str.strip()
        
        # Convert volume to numeric
        if 'total_volume' in df.columns:
            df['total_volume'] = pd.to_numeric(df['total_volume'], errors='coerce')
            # Replace NaN with 0
            df['total_volume'] = df['total_volume'].fillna(0)
        
        # Convert transaction count to numeric
        if 'total_txns' in df.columns:
            df['total_txns'] = pd.to_numeric(df['total_txns'], errors='coerce')
            # Replace NaN with 0
            df['total_txns'] = df['total_txns'].fillna(0)
        
        # Add month column
        df['month'] = month
        
        # Add datasource column (using filename or other identifier)
        df['datasource'] = f"excel_import_{month}"
        
        # Add created_at timestamp
        df['created_at'] = datetime.now().isoformat()
        
        # Remove rows with missing merchant IDs
        df = df.dropna(subset=['mid'])
        
        logger.info(f"Cleaned merchant data: {len(df)} rows")
        return df
    
    def clean_residual_data(self, df: pd.DataFrame, month: str) -> pd.DataFrame:
        """
        Clean and standardize residual data.
        
        Args:
            df: DataFrame with residual data
            month: Month in format YYYY-MM
            
        Returns:
            Cleaned DataFrame
        """
        df = df.copy()
        
        # Ensure required columns exist
        required_cols = ['mid', 'net_profit']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            logger.warning(f"Missing required columns: {missing_cols}")
            # Try to infer missing columns
            if 'mid' not in df.columns and df.shape[1] > 0:
                # Assume first column is merchant ID
                df = df.rename(columns={df.columns[0]: 'mid'})
                logger.info(f"Inferred column {df.columns[0]} as 'mid'")
            
            if 'net_profit' not in df.columns:
                # Look for columns that might contain profit values
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) > 0:
                    # Use the last numeric column as net_profit
                    df = df.rename(columns={numeric_cols[-1]: 'net_profit'})
                    logger.info(f"Inferred column {numeric_cols[-1]} as 'net_profit'")
        
        # Clean merchant IDs
        if 'mid' in df.columns:
            # Convert to string and strip whitespace
            df['mid'] = df['mid'].astype(str).str.strip()
            
            # Remove any non-alphanumeric characters
            df['mid'] = df['mid'].str.replace(r'[^a-zA-Z0-9]', '', regex=True)
        
        # Convert net profit to numeric
        if 'net_profit' in df.columns:
            df['net_profit'] = pd.to_numeric(df['net_profit'], errors='coerce')
            # Replace NaN with 0
            df['net_profit'] = df['net_profit'].fillna(0)
        
        # Add payout month column
        df['payout_month'] = month
        
        # Add created_at timestamp
        df['created_at'] = datetime.now().isoformat()
        
        # Generate unique ID for each record
        df['id'] = df['mid'] + '_' + df['payout_month']
        
        # Remove rows with missing merchant IDs or net profit
        df = df.dropna(subset=['mid', 'net_profit'])
        
        logger.info(f"Cleaned residual data: {len(df)} rows")
        return df
    
    def transform_data(self, df: pd.DataFrame, file_type: str, month: str) -> pd.DataFrame:
        """
        Transform data based on file type.
        
        Args:
            df: DataFrame to transform
            file_type: Type of file ('merchant' or 'residual')
            month: Month in format YYYY-MM
            
        Returns:
            Transformed DataFrame
        """
        # First normalize column names
        df = self.normalize_column_names(df, file_type)
        
        # Then clean and standardize based on file type
        if file_type == 'merchant':
            return self.clean_merchant_data(df, month)
        else:  # residual
            return self.clean_residual_data(df, month)
    
    def merge_merchant_residual_data(self, merchant_df: pd.DataFrame, residual_df: pd.DataFrame) -> pd.DataFrame:
        """
        Merge merchant and residual data for the same month.
        
        Args:
            merchant_df: DataFrame with merchant data
            residual_df: DataFrame with residual data
            
        Returns:
            Merged DataFrame
        """
        # Ensure both DataFrames have the required columns
        if 'mid' not in merchant_df.columns or 'mid' not in residual_df.columns:
            logger.error("Cannot merge DataFrames: 'mid' column missing")
            raise ValueError("Both DataFrames must have 'mid' column for merging")
        
        # Merge on merchant ID
        merged_df = pd.merge(
            merchant_df,
            residual_df[['mid', 'net_profit', 'payout_month']],
            on='mid',
            how='outer'
        )
        
        # Fill missing values
        merged_df['total_volume'] = merged_df['total_volume'].fillna(0)
        merged_df['total_txns'] = merged_df['total_txns'].fillna(0)
        merged_df['net_profit'] = merged_df['net_profit'].fillna(0)
        
        # Calculate profit margin
        merged_df['profit_margin'] = np.where(
            merged_df['total_volume'] > 0,
            merged_df['net_profit'] / merged_df['total_volume'] * 100,
            0
        )
        
        logger.info(f"Merged data: {len(merged_df)} rows")
        return merged_df
