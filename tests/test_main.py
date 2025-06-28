"""
Unit tests for the main pipeline runner script.
"""
import os
import sys
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock, mock_open, call
import argparse

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the main module
from irelandpay_analytics.main import (
    parse_arguments,
    setup_logging,
    load_and_process_data,
    generate_reports_and_dashboards,
    send_notifications,
    main
)

class TestMain:
    """Test cases for the main pipeline runner script."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Sample command line arguments
        self.args = argparse.Namespace(
            month='2023-05',
            skip_sync=False,
            skip_reports=False,
            skip_notifications=False,
            log_level='INFO'
        )
        
        # Sample merchant DataFrame
        self.merchant_df = pd.DataFrame({
            'mid': ['123456', '789012'],
            'merchant_dba': ['Merchant 1', 'Merchant 2'],
            'total_volume': [10000.0, 20000.0],
            'total_txns': [100, 200],
            'month': ['2023-05', '2023-05']
        })
        
        # Sample residual DataFrame
        self.residual_df = pd.DataFrame({
            'mid': ['123456', '789012'],
            'net_profit': [500.0, 1000.0],
            'month': ['2023-05', '2023-05']
        })
        
        # Sample processed DataFrame (merged merchant and residual)
        self.processed_df = pd.DataFrame({
            'mid': ['123456', '789012'],
            'merchant_dba': ['Merchant 1', 'Merchant 2'],
            'total_volume': [10000.0, 20000.0],
            'total_txns': [100, 200],
            'net_profit': [500.0, 1000.0],
            'month': ['2023-05', '2023-05']
        })
        
        # Sample agent DataFrame
        self.agent_df = pd.DataFrame({
            'agent_name': ['Agent 1', 'Agent 2'],
            'total_earnings': [250.0, 500.0],
            'merchant_count': [1, 1],
            'month': ['2023-05', '2023-05']
        })
        
        # Sample agent report data
        self.agent_reports = [
            {
                'agent_name': 'Agent 1',
                'current_month': '2023-05',
                'summary': {
                    'total_volume': 10000.0,
                    'total_earnings': 250.0,
                    'merchant_count': 1
                }
            },
            {
                'agent_name': 'Agent 2',
                'current_month': '2023-05',
                'summary': {
                    'total_volume': 20000.0,
                    'total_earnings': 500.0,
                    'merchant_count': 1
                }
            }
        ]
        
        # Sample monthly summary data
        self.monthly_summary = {
            'current_month': '2023-05',
            'volume_trend': [{'month': '2023-05', 'total_volume': 30000.0}],
            'profit_trend': [{'month': '2023-05', 'total_profit': 1500.0}],
            'top_agents': [
                {'agent_name': 'Agent 2', 'total_earnings': 500.0},
                {'agent_name': 'Agent 1', 'total_earnings': 250.0}
            ]
        }
    
    def test_parse_arguments(self):
        """Test parsing command line arguments."""
        # Mock sys.argv
        with patch('sys.argv', ['main.py', '--month', '2023-05', '--skip-sync']):
            # Call the function
            args = parse_arguments()
            
            # Verify the results
            assert args.month == '2023-05'
            assert args.skip_sync is True
            assert args.skip_reports is False
            assert args.skip_notifications is False
    
    @patch('irelandpay_analytics.main.logging')
    def test_setup_logging(self, mock_logging):
        """Test setting up logging."""
        # Mock file handler and formatter
        mock_file_handler = MagicMock()
        mock_stream_handler = MagicMock()
        mock_formatter = MagicMock()
        mock_logging.FileHandler.return_value = mock_file_handler
        mock_logging.StreamHandler.return_value = mock_stream_handler
        mock_logging.Formatter.return_value = mock_formatter
        
        # Call the function
        logger = setup_logging('INFO')
        
        # Verify the results
        assert logger is not None
        mock_logging.getLogger.assert_called_once()
        mock_logging.FileHandler.assert_called_once()
        mock_logging.StreamHandler.assert_called_once()
        mock_logging.Formatter.assert_called_once()
        mock_file_handler.setFormatter.assert_called_once_with(mock_formatter)
        mock_stream_handler.setFormatter.assert_called_once_with(mock_formatter)
    
    @patch('irelandpay_analytics.main.ExcelLoader')
    @patch('irelandpay_analytics.main.Transformer')
    @patch('irelandpay_analytics.main.ResidualCalculator')
    def test_load_and_process_data(self, mock_residual_calc, mock_transformer, mock_excel_loader):
        """Test loading and processing data."""
        # Set up mock logger
        mock_logger = MagicMock()
        
        # Set up mock ExcelLoader
        mock_loader_instance = MagicMock()
        mock_loader_instance.list_files_for_month.return_value = ['merchant.xlsx', 'residual.xlsx']
        mock_loader_instance.detect_file_type.side_effect = ['merchant', 'residual']
        mock_loader_instance.load_merchant_file.return_value = self.merchant_df
        mock_loader_instance.load_residual_file.return_value = self.residual_df
        mock_excel_loader.return_value = mock_loader_instance
        
        # Set up mock Transformer
        mock_transformer_instance = MagicMock()
        mock_transformer_instance.normalize_merchant_data.return_value = self.merchant_df
        mock_transformer_instance.normalize_residual_data.return_value = self.residual_df
        mock_transformer_instance.merge_datasets.return_value = self.processed_df
        mock_transformer.return_value = mock_transformer_instance
        
        # Set up mock ResidualCalculator
        mock_calc_instance = MagicMock()
        mock_calc_instance.calculate_residuals.return_value = self.processed_df
        mock_calc_instance.aggregate_agent_earnings.return_value = self.agent_df
        mock_residual_calc.return_value = mock_calc_instance
        
        # Call the function
        result = load_and_process_data('2023-05', mock_logger)
        
        # Verify the results
        assert 'processed_df' in result
        assert 'agent_df' in result
        assert result['processed_df'] is self.processed_df
        assert result['agent_df'] is self.agent_df
        
        # Verify the mock calls
        mock_excel_loader.assert_called_once()
        mock_loader_instance.list_files_for_month.assert_called_once_with('2023-05')
        assert mock_loader_instance.detect_file_type.call_count == 2
        mock_loader_instance.load_merchant_file.assert_called_once()
        mock_loader_instance.load_residual_file.assert_called_once()
        
        mock_transformer.assert_called_once()
        mock_transformer_instance.normalize_merchant_data.assert_called_once()
        mock_transformer_instance.normalize_residual_data.assert_called_once()
        mock_transformer_instance.merge_datasets.assert_called_once()
        
        mock_residual_calc.assert_called_once()
        mock_calc_instance.calculate_residuals.assert_called_once()
        mock_calc_instance.aggregate_agent_earnings.assert_called_once()
    
    @patch('irelandpay_analytics.main.AgentSummary')
    @patch('irelandpay_analytics.main.MerchantSummary')
    @patch('irelandpay_analytics.main.TrendTracker')
    @patch('irelandpay_analytics.main.PDFGenerator')
    @patch('irelandpay_analytics.main.DashboardPrep')
    def test_generate_reports_and_dashboards(
        self, mock_dashboard_prep, mock_pdf_gen, mock_trend_tracker, 
        mock_merchant_summary, mock_agent_summary
    ):
        """Test generating reports and dashboards."""
        # Set up mock logger
        mock_logger = MagicMock()
        
        # Set up mock AgentSummary
        mock_agent_summary_instance = MagicMock()
        mock_agent_summary_instance.generate_agent_report.side_effect = self.agent_reports
        mock_agent_summary.return_value = mock_agent_summary_instance
        
        # Set up mock MerchantSummary
        mock_merchant_summary_instance = MagicMock()
        mock_merchant_summary.return_value = mock_merchant_summary_instance
        
        # Set up mock TrendTracker
        mock_trend_tracker_instance = MagicMock()
        mock_trend_tracker_instance.generate_trend_report.return_value = self.monthly_summary
        mock_trend_tracker.return_value = mock_trend_tracker_instance
        
        # Set up mock PDFGenerator
        mock_pdf_gen_instance = MagicMock()
        mock_pdf_gen_instance.generate_agent_statement.return_value = '/path/to/agent_statement.pdf'
        mock_pdf_gen_instance.generate_monthly_summary.return_value = '/path/to/monthly_summary.pdf'
        mock_pdf_gen.return_value = mock_pdf_gen_instance
        
        # Set up mock DashboardPrep
        mock_dashboard_prep_instance = MagicMock()
        mock_dashboard_prep_instance.prepare_all_dashboards.return_value = ['/path/to/dashboard.json']
        mock_dashboard_prep.return_value = mock_dashboard_prep_instance
        
        # Call the function
        result = generate_reports_and_dashboards(self.processed_df, self.agent_df, '2023-05', mock_logger)
        
        # Verify the results
        assert 'agent_reports' in result
        assert 'monthly_summary' in result
        assert 'report_paths' in result
        assert 'dashboard_paths' in result
        assert len(result['agent_reports']) == 2
        assert result['monthly_summary'] == self.monthly_summary
        assert len(result['report_paths']) == 3  # 2 agent statements + 1 monthly summary
        assert len(result['dashboard_paths']) == 1
        
        # Verify the mock calls
        mock_agent_summary.assert_called_once()
        assert mock_agent_summary_instance.generate_agent_report.call_count == 2
        
        mock_trend_tracker.assert_called_once()
        mock_trend_tracker_instance.generate_trend_report.assert_called_once()
        
        mock_pdf_gen.assert_called_once()
        assert mock_pdf_gen_instance.generate_agent_statement.call_count == 2
        mock_pdf_gen_instance.generate_monthly_summary.assert_called_once()
        
        mock_dashboard_prep.assert_called_once()
        mock_dashboard_prep_instance.prepare_all_dashboards.assert_called_once()
    
    @patch('irelandpay_analytics.main.Notifier')
    def test_send_notifications(self, mock_notifier):
        """Test sending notifications."""
        # Set up mock logger
        mock_logger = MagicMock()
        
        # Set up mock Notifier
        mock_notifier_instance = MagicMock()
        mock_notifier_instance.notify_agent_statement_ready.return_value = True
        mock_notifier_instance.notify_pipeline_success.return_value = True
        mock_notifier.return_value = mock_notifier_instance
        
        # Call the function
        send_notifications(
            self.agent_reports,
            self.monthly_summary,
            ['path1.pdf', 'path2.pdf'],
            ['path1.json', 'path2.json'],
            '2023-05',
            100,  # merchants_processed
            50,   # residuals_processed
            mock_logger
        )
        
        # Verify the mock calls
        mock_notifier.assert_called_once()
        assert mock_notifier_instance.notify_agent_statement_ready.call_count == 2
        mock_notifier_instance.notify_pipeline_success.assert_called_once()
    
    @patch('irelandpay_analytics.main.parse_arguments')
    @patch('irelandpay_analytics.main.setup_logging')
    @patch('irelandpay_analytics.main.load_and_process_data')
    @patch('irelandpay_analytics.main.DataSynchronizer')
    @patch('irelandpay_analytics.main.generate_reports_and_dashboards')
    @patch('irelandpay_analytics.main.send_notifications')
    def test_main(
        self, mock_send_notifications, mock_generate_reports, 
        mock_data_sync, mock_load_and_process, mock_setup_logging, 
        mock_parse_arguments
    ):
        """Test the main function."""
        # Set up mock arguments
        mock_parse_arguments.return_value = self.args
        
        # Set up mock logger
        mock_logger = MagicMock()
        mock_setup_logging.return_value = mock_logger
        
        # Set up mock load_and_process_data
        mock_load_and_process.return_value = {
            'processed_df': self.processed_df,
            'agent_df': self.agent_df,
            'merchants_processed': 2,
            'residuals_processed': 2
        }
        
        # Set up mock DataSynchronizer
        mock_sync_instance = MagicMock()
        mock_sync_instance.sync_all_data.return_value = {
            'merchant': {'total': 2, 'inserted': 1, 'upserted': 1, 'failed': 0},
            'residual': {'total': 2, 'inserted': 1, 'upserted': 1, 'failed': 0}
        }
        mock_sync_instance.sync_agent_data.return_value = {
            'total': 2, 'inserted': 1, 'upserted': 1, 'failed': 0
        }
        mock_data_sync.return_value = mock_sync_instance
        
        # Set up mock generate_reports_and_dashboards
        mock_generate_reports.return_value = {
            'agent_reports': self.agent_reports,
            'monthly_summary': self.monthly_summary,
            'report_paths': ['/path/to/report1.pdf', '/path/to/report2.pdf'],
            'dashboard_paths': ['/path/to/dashboard1.json', '/path/to/dashboard2.json']
        }
        
        # Call the function
        main()
        
        # Verify the mock calls
        mock_parse_arguments.assert_called_once()
        mock_setup_logging.assert_called_once_with('INFO')
        mock_load_and_process.assert_called_once_with('2023-05', mock_logger)
        
        mock_data_sync.assert_called_once()
        mock_sync_instance.sync_all_data.assert_called_once()
        mock_sync_instance.sync_agent_data.assert_called_once()
        
        mock_generate_reports.assert_called_once()
        mock_send_notifications.assert_called_once()
    
    @patch('irelandpay_analytics.main.parse_arguments')
    @patch('irelandpay_analytics.main.setup_logging')
    @patch('irelandpay_analytics.main.load_and_process_data')
    @patch('irelandpay_analytics.main.DataSynchronizer')
    @patch('irelandpay_analytics.main.generate_reports_and_dashboards')
    @patch('irelandpay_analytics.main.send_notifications')
    def test_main_with_skip_flags(
        self, mock_send_notifications, mock_generate_reports, 
        mock_data_sync, mock_load_and_process, mock_setup_logging, 
        mock_parse_arguments
    ):
        """Test the main function with skip flags."""
        # Set up mock arguments with skip flags
        args = self.args
        args.skip_sync = True
        args.skip_reports = True
        args.skip_notifications = True
        mock_parse_arguments.return_value = args
        
        # Set up mock logger
        mock_logger = MagicMock()
        mock_setup_logging.return_value = mock_logger
        
        # Set up mock load_and_process_data
        mock_load_and_process.return_value = {
            'processed_df': self.processed_df,
            'agent_df': self.agent_df,
            'merchants_processed': 2,
            'residuals_processed': 2
        }
        
        # Call the function
        main()
        
        # Verify the mock calls
        mock_parse_arguments.assert_called_once()
        mock_setup_logging.assert_called_once_with('INFO')
        mock_load_and_process.assert_called_once_with('2023-05', mock_logger)
        
        # These should not be called due to skip flags
        mock_data_sync.assert_not_called()
        mock_generate_reports.assert_not_called()
        mock_send_notifications.assert_not_called()
    
    @patch('irelandpay_analytics.main.parse_arguments')
    @patch('irelandpay_analytics.main.setup_logging')
    @patch('irelandpay_analytics.main.load_and_process_data')
    @patch('irelandpay_analytics.main.Notifier')
    def test_main_with_error(
        self, mock_notifier, mock_load_and_process, 
        mock_setup_logging, mock_parse_arguments
    ):
        """Test the main function with an error."""
        # Set up mock arguments
        mock_parse_arguments.return_value = self.args
        
        # Set up mock logger
        mock_logger = MagicMock()
        mock_setup_logging.return_value = mock_logger
        
        # Set up mock load_and_process_data to raise an exception
        mock_load_and_process.side_effect = Exception('Test error')
        
        # Set up mock Notifier
        mock_notifier_instance = MagicMock()
        mock_notifier_instance.notify_pipeline_error.return_value = True
        mock_notifier.return_value = mock_notifier_instance
        
        # Call the function
        main()
        
        # Verify the mock calls
        mock_parse_arguments.assert_called_once()
        mock_setup_logging.assert_called_once_with('INFO')
        mock_load_and_process.assert_called_once_with('2023-05', mock_logger)
        
        # Error notification should be called
        mock_notifier.assert_called_once()
        mock_notifier_instance.notify_pipeline_error.assert_called_once()
