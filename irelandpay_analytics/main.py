"""
Main runner script for the Ireland Pay Analytics Pipeline.

This script orchestrates the entire pipeline:
1. Ingests Excel files from the raw data directory
2. Transforms and normalizes the data
3. Applies residual calculations
4. Generates analytics
5. Syncs data to Supabase
6. Generates reports and dashboards
7. Sends notifications

Usage:
    python -m irelandpay_analytics.main --month YYYY-MM [--skip-sync] [--skip-reports] [--skip-notify]
"""
import argparse
import logging
import time
import traceback
import sys
from datetime import datetime
from pathlib import Path
import pandas as pd

# Import pipeline modules
from irelandpay_analytics.config import settings
from irelandpay_analytics.ingest.excel_loader import ExcelLoader
from irelandpay_analytics.ingest.transformer import Transformer
from irelandpay_analytics.ingest.residual_calcs import ResidualCalculator
from irelandpay_analytics.analytics.agent_summary import AgentSummary
from irelandpay_analytics.analytics.merchant_summary import MerchantSummary
from irelandpay_analytics.analytics.trend_tracker import TrendTracker
from irelandpay_analytics.db.supabase_client import SupabaseClient
from irelandpay_analytics.db.sync import DataSynchronizer
from irelandpay_analytics.reports.pdf_generator import PDFGenerator
from irelandpay_analytics.reports.dashboard_prep import DashboardPrep
from irelandpay_analytics.reports.notifier import Notifier

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(settings.LOG_DIR / f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Ireland Pay Analytics Pipeline')
    parser.add_argument('--month', type=str, help='Month to process in YYYY-MM format')
    parser.add_argument('--skip-sync', action='store_true', help='Skip syncing data to Supabase')
    parser.add_argument('--skip-reports', action='store_true', help='Skip generating reports')
    parser.add_argument('--skip-notify', action='store_true', help='Skip sending notifications')
    return parser.parse_args()

def main():
    """Main pipeline runner."""
    start_time = time.time()
    args = parse_arguments()
    
    # If month is not provided, use current month
    if not args.month:
        current_date = datetime.now()
        args.month = f"{current_date.year}-{current_date.month:02d}"
    
    logger.info(f"Starting Ireland Pay Analytics Pipeline for {args.month}")
    logger.info(f"Skip sync: {args.skip_sync}, Skip reports: {args.skip_reports}, Skip notify: {args.skip_notify}")
    
    try:
        # Initialize pipeline components
        excel_loader = ExcelLoader()
        transformer = Transformer()
        residual_calc = ResidualCalculator()
        agent_summary = AgentSummary()
        merchant_summary = MerchantSummary()
        trend_tracker = TrendTracker()
        
        # Step 1: Load Excel files
        logger.info("Step 1: Loading Excel files")
        excel_files = excel_loader.list_excel_files()
        
        if not excel_files:
            raise ValueError(f"No Excel files found in {settings.RAW_DATA_DIR}")
        
        logger.info(f"Found {len(excel_files)} Excel files")
        
        # Filter files for the specified month if provided
        if args.month:
            filtered_files = []
            for file_path in excel_files:
                file_date = excel_loader.extract_date_from_filename(file_path)
                if file_date and file_date.startswith(args.month):
                    filtered_files.append(file_path)
            
            excel_files = filtered_files
            logger.info(f"Filtered to {len(excel_files)} files for month {args.month}")
            
            if not excel_files:
                raise ValueError(f"No Excel files found for month {args.month}")
        
        # Load and categorize files
        merchant_dfs = []
        residual_dfs = []
        
        for file_path in excel_files:
            file_type = excel_loader.detect_file_type(file_path)
            if file_type == 'merchant':
                df = excel_loader.load_merchant_file(file_path)
                if df is not None and not df.empty:
                    merchant_dfs.append(df)
            elif file_type == 'residual':
                df = excel_loader.load_residual_file(file_path)
                if df is not None and not df.empty:
                    residual_dfs.append(df)
        
        if not merchant_dfs and not residual_dfs:
            raise ValueError("No valid data loaded from Excel files")
        
        # Step 2: Transform and normalize data
        logger.info("Step 2: Transforming and normalizing data")
        
        # Combine multiple dataframes if needed
        merchant_df = pd.concat(merchant_dfs) if merchant_dfs else None
        residual_df = pd.concat(residual_dfs) if residual_dfs else None
        
        if merchant_df is None and residual_df is None:
            raise ValueError("No valid data after transformation")
        
        # Clean and normalize
        if merchant_df is not None:
            merchant_df = transformer.clean_merchant_data(merchant_df)
        
        if residual_df is not None:
            residual_df = transformer.clean_residual_data(residual_df)
        
        # Merge merchant and residual data if both are available
        if merchant_df is not None and residual_df is not None:
            combined_df = transformer.merge_merchant_and_residual(merchant_df, residual_df)
            logger.info(f"Combined data has {len(combined_df)} rows")
        else:
            combined_df = merchant_df if merchant_df is not None else residual_df
            logger.info(f"Using single source data with {len(combined_df)} rows")
        
        # Step 3: Apply residual calculations
        logger.info("Step 3: Applying residual calculations")
        
        # Load equipment balances and agent splits
        equipment_balances = residual_calc.load_equipment_balances()
        agent_splits = residual_calc.load_agent_splits()
        
        # Apply calculations
        processed_df = residual_calc.apply_residual_calculations(
            combined_df, 
            equipment_balances=equipment_balances,
            agent_splits=agent_splits
        )
        
        agent_earnings_df = residual_calc.calculate_agent_earnings(processed_df, agent_splits)
        
        logger.info(f"Processed data has {len(processed_df)} rows")
        logger.info(f"Agent earnings data has {len(agent_earnings_df)} rows")
        
        # Step 4: Generate analytics
        logger.info("Step 4: Generating analytics")
        
        # Agent analytics
        agent_metrics = agent_summary.calculate_agent_metrics(agent_earnings_df)
        top_agents = agent_summary.get_top_agents(agent_metrics)
        agent_outliers = agent_summary.identify_outliers(agent_metrics)
        
        # Merchant analytics
        merchant_metrics = merchant_summary.calculate_merchant_metrics(processed_df)
        top_merchants = merchant_summary.get_top_merchants(merchant_metrics)
        merchant_outliers = merchant_summary.identify_outliers(merchant_metrics)
        
        # Trend analytics
        volume_trend = trend_tracker.calculate_volume_trend(processed_df)
        profit_trend = trend_tracker.calculate_profit_trend(processed_df)
        retention_metrics = trend_tracker.calculate_merchant_retention(processed_df)
        
        # Step 5: Sync data to Supabase (optional)
        if not args.skip_sync:
            logger.info("Step 5: Syncing data to Supabase")
            
            # Initialize Supabase client and synchronizer
            supabase_client = SupabaseClient()
            data_sync = DataSynchronizer(supabase_client)
            
            # Sync merchant data
            merchant_sync_result = data_sync.sync_merchant_data(processed_df)
            logger.info(f"Merchant sync result: {merchant_sync_result}")
            
            # Sync residual data
            residual_sync_result = data_sync.sync_residual_data(processed_df)
            logger.info(f"Residual sync result: {residual_sync_result}")
            
            # Sync agent earnings data
            agent_sync_result = data_sync.sync_agent_data(agent_earnings_df)
            logger.info(f"Agent sync result: {agent_sync_result}")
        else:
            logger.info("Skipping Supabase sync as requested")
        
        # Step 6: Generate reports and dashboards (optional)
        report_files = []
        if not args.skip_reports:
            logger.info("Step 6: Generating reports and dashboards")
            
            # Initialize report generators
            pdf_generator = PDFGenerator()
            dashboard_prep = DashboardPrep()
            
            # Generate PDF reports
            
            # Monthly summary report
            summary_data = {
                'merchant_count': len(processed_df),
                'agent_count': len(agent_metrics),
                'total_volume': processed_df['total_volume'].sum(),
                'total_txns': processed_df['total_txns'].sum() if 'total_txns' in processed_df.columns else 0,
                'total_profit': processed_df['net_profit'].sum(),
                'processing_time': time.time() - start_time
            }
            
            monthly_report_path = pdf_generator.create_monthly_summary(
                args.month, 
                summary_data,
                agent_metrics,
                top_merchants
            )
            report_files.append(monthly_report_path)
            
            # Agent statements
            for _, agent_row in agent_metrics.iterrows():
                agent_name = agent_row['agent_name']
                agent_data = agent_row.to_dict()
                
                # Get merchants for this agent
                agent_merchants = processed_df[processed_df['agent_name'] == agent_name]
                
                if not agent_merchants.empty:
                    agent_report_path = pdf_generator.create_agent_statement(
                        agent_name,
                        args.month,
                        agent_data,
                        agent_merchants
                    )
                    report_files.append(agent_report_path)
            
            # Generate dashboard JSON files
            dashboard_prep.generate_top_merchants_json(top_merchants)
            dashboard_prep.generate_top_agents_json(top_agents)
            dashboard_prep.generate_volume_trend_json(volume_trend)
            dashboard_prep.generate_monthly_summary_json(args.month, summary_data)
            
            # Generate admin dashboard data
            dashboard_prep.generate_admin_dashboard_data(
                agent_metrics,
                volume_trend,
                profit_trend
            )
            
            # Generate individual agent dashboard data
            for _, agent_row in agent_metrics.iterrows():
                agent_name = agent_row['agent_name']
                agent_data = agent_row.to_dict()
                
                # Get merchants for this agent
                agent_merchants = processed_df[processed_df['agent_name'] == agent_name]
                
                if not agent_merchants.empty:
                    # Get trend data for this agent
                    agent_trend = agent_summary.calculate_agent_trend(agent_name, processed_df)
                    
                    dashboard_prep.generate_agent_dashboard_data(
                        agent_name,
                        agent_data,
                        agent_merchants,
                        agent_trend
                    )
        else:
            logger.info("Skipping report generation as requested")
        
        # Step 7: Send notifications (optional)
        if not args.skip_notify:
            logger.info("Step 7: Sending notifications")
            
            notifier = Notifier()
            
            # Prepare summary statistics for notification
            summary_stats = {
                'merchant_count': len(processed_df),
                'total_volume': processed_df['total_volume'].sum(),
                'total_profit': processed_df['net_profit'].sum(),
                'processing_time': time.time() - start_time
            }
            
            # Send pipeline success notification
            notifier.notify_pipeline_success(args.month, summary_stats, report_files)
        else:
            logger.info("Skipping notifications as requested")
        
        # Calculate and log total processing time
        end_time = time.time()
        processing_time = end_time - start_time
        logger.info(f"Pipeline completed successfully in {processing_time:.2f} seconds")
        
        return 0
        
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Send error notification if not skipped
        if not args.skip_notify:
            try:
                notifier = Notifier()
                notifier.notify_pipeline_error(
                    args.month, 
                    str(e), 
                    traceback.format_exc()
                )
            except Exception as notify_error:
                logger.error(f"Failed to send error notification: {str(notify_error)}")
        
        return 1

if __name__ == "__main__":
    sys.exit(main())
