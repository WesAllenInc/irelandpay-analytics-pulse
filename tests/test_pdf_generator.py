"""
Unit tests for the PDF Generator module.
"""
import os
import sys
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock, mock_open
from io import BytesIO
import matplotlib.pyplot as plt

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irelandpay_analytics.reports.pdf_generator import PDFGenerator

class TestPDFGenerator:
    """Test cases for the PDFGenerator class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Create a patched PDFGenerator
        with patch('irelandpay_analytics.reports.pdf_generator.FPDF') as mock_fpdf:
            self.mock_pdf = MagicMock()
            mock_fpdf.return_value = self.mock_pdf
            self.generator = PDFGenerator()
        
        # Sample agent data
        self.agent_data = {
            'agent_name': 'Test Agent',
            'current_month': '2023-05',
            'summary': {
                'total_volume': 100000.0,
                'total_earnings': 5000.0,
                'merchant_count': 10,
                'effective_bps': 50.0
            },
            'trend': [
                {'month': '2023-03', 'total_volume': 80000.0, 'total_earnings': 4000.0},
                {'month': '2023-04', 'total_volume': 90000.0, 'total_earnings': 4500.0},
                {'month': '2023-05', 'total_volume': 100000.0, 'total_earnings': 5000.0}
            ],
            'merchants': [
                {'merchant_dba': 'Merchant 1', 'total_volume': 50000.0, 'residual': 2500.0},
                {'merchant_dba': 'Merchant 2', 'total_volume': 30000.0, 'residual': 1500.0},
                {'merchant_dba': 'Merchant 3', 'total_volume': 20000.0, 'residual': 1000.0}
            ]
        }
        
        # Sample merchant data
        self.merchant_data = {
            'mid': '123456',
            'merchant_dba': 'Test Merchant',
            'current_month': '2023-05',
            'summary': {
                'total_volume': 50000.0,
                'net_profit': 2500.0,
                'total_txns': 500,
                'profit_margin': 5.0,
                'bps': 50.0,
                'avg_txn_size': 100.0
            },
            'trend': [
                {'month': '2023-03', 'total_volume': 40000.0, 'net_profit': 2000.0},
                {'month': '2023-04', 'total_volume': 45000.0, 'net_profit': 2250.0},
                {'month': '2023-05', 'total_volume': 50000.0, 'net_profit': 2500.0}
            ]
        }
        
        # Sample monthly summary data
        self.monthly_summary = {
            'current_month': '2023-05',
            'volume_trend': [
                {'month': '2023-03', 'total_volume': 800000.0},
                {'month': '2023-04', 'total_volume': 900000.0},
                {'month': '2023-05', 'total_volume': 1000000.0}
            ],
            'profit_trend': [
                {'month': '2023-03', 'total_profit': 40000.0},
                {'month': '2023-04', 'total_profit': 45000.0},
                {'month': '2023-05', 'total_profit': 50000.0}
            ],
            'growth_rates': {
                'volume_growth': 25.0,
                'profit_growth': 25.0,
                'merchant_growth': 20.0
            },
            'top_agents': [
                {'agent_name': 'Agent 1', 'total_earnings': 20000.0, 'total_volume': 400000.0},
                {'agent_name': 'Agent 2', 'total_earnings': 15000.0, 'total_volume': 300000.0},
                {'agent_name': 'Agent 3', 'total_earnings': 10000.0, 'total_volume': 200000.0}
            ],
            'top_merchants': [
                {'merchant_dba': 'Merchant 1', 'net_profit': 10000.0, 'total_volume': 200000.0},
                {'merchant_dba': 'Merchant 2', 'net_profit': 7500.0, 'total_volume': 150000.0},
                {'merchant_dba': 'Merchant 3', 'net_profit': 5000.0, 'total_volume': 100000.0}
            ]
        }
    
    @patch('irelandpay_analytics.reports.pdf_generator.plt')
    @patch('irelandpay_analytics.reports.pdf_generator.BytesIO')
    def test_create_volume_chart(self, mock_bytesio, mock_plt):
        """Test creating a volume chart."""
        # Set up mock BytesIO
        mock_buffer = MagicMock()
        mock_bytesio.return_value = mock_buffer
        
        # Set up mock figure and axes
        mock_fig = MagicMock()
        mock_ax = MagicMock()
        mock_plt.subplots.return_value = (mock_fig, mock_ax)
        
        # Call the method
        chart_data = self.generator._create_volume_chart(self.agent_data['trend'])
        
        # Verify that the chart was created
        mock_plt.subplots.assert_called_once()
        mock_ax.plot.assert_called_once()
        mock_ax.set_title.assert_called_once()
        mock_fig.savefig.assert_called_once()
        mock_buffer.getvalue.assert_called_once()
    
    @patch('irelandpay_analytics.reports.pdf_generator.plt')
    @patch('irelandpay_analytics.reports.pdf_generator.BytesIO')
    def test_create_earnings_chart(self, mock_bytesio, mock_plt):
        """Test creating an earnings chart."""
        # Set up mock BytesIO
        mock_buffer = MagicMock()
        mock_bytesio.return_value = mock_buffer
        
        # Set up mock figure and axes
        mock_fig = MagicMock()
        mock_ax = MagicMock()
        mock_plt.subplots.return_value = (mock_fig, mock_ax)
        
        # Call the method
        chart_data = self.generator._create_earnings_chart(self.agent_data['trend'])
        
        # Verify that the chart was created
        mock_plt.subplots.assert_called_once()
        mock_ax.plot.assert_called_once()
        mock_ax.set_title.assert_called_once()
        mock_fig.savefig.assert_called_once()
        mock_buffer.getvalue.assert_called_once()
    
    def test_generate_agent_statement(self):
        """Test generating an agent statement."""
        # Mock the chart creation methods
        self.generator._create_volume_chart = MagicMock(return_value=b'volume_chart')
        self.generator._create_earnings_chart = MagicMock(return_value=b'earnings_chart')
        
        # Call the method
        with patch('builtins.open', mock_open()) as mock_file:
            output_path = self.generator.generate_agent_statement(self.agent_data)
        
        # Verify that the PDF was created
        assert self.mock_pdf.add_page.call_count >= 1
        assert self.mock_pdf.set_font.call_count >= 1
        assert self.mock_pdf.cell.call_count >= 1
        assert self.mock_pdf.output.call_count == 1
        
        # Verify that the charts were created
        self.generator._create_volume_chart.assert_called_once()
        self.generator._create_earnings_chart.assert_called_once()
        
        # Verify that the output path is correct
        assert 'Test_Agent_Statement_2023-05.pdf' in output_path
    
    def test_generate_merchant_report(self):
        """Test generating a merchant report."""
        # Mock the chart creation method
        self.generator._create_volume_chart = MagicMock(return_value=b'volume_chart')
        
        # Call the method
        with patch('builtins.open', mock_open()) as mock_file:
            output_path = self.generator.generate_merchant_report(self.merchant_data)
        
        # Verify that the PDF was created
        assert self.mock_pdf.add_page.call_count >= 1
        assert self.mock_pdf.set_font.call_count >= 1
        assert self.mock_pdf.cell.call_count >= 1
        assert self.mock_pdf.output.call_count == 1
        
        # Verify that the chart was created
        self.generator._create_volume_chart.assert_called_once()
        
        # Verify that the output path is correct
        assert 'Test_Merchant_Report_2023-05.pdf' in output_path
    
    @patch('irelandpay_analytics.reports.pdf_generator.plt')
    @patch('irelandpay_analytics.reports.pdf_generator.BytesIO')
    def test_create_monthly_volume_chart(self, mock_bytesio, mock_plt):
        """Test creating a monthly volume chart."""
        # Set up mock BytesIO
        mock_buffer = MagicMock()
        mock_bytesio.return_value = mock_buffer
        
        # Set up mock figure and axes
        mock_fig = MagicMock()
        mock_ax = MagicMock()
        mock_plt.subplots.return_value = (mock_fig, mock_ax)
        
        # Call the method
        chart_data = self.generator._create_monthly_volume_chart(self.monthly_summary['volume_trend'])
        
        # Verify that the chart was created
        mock_plt.subplots.assert_called_once()
        mock_ax.plot.assert_called_once()
        mock_ax.set_title.assert_called_once()
        mock_fig.savefig.assert_called_once()
        mock_buffer.getvalue.assert_called_once()
    
    @patch('irelandpay_analytics.reports.pdf_generator.plt')
    @patch('irelandpay_analytics.reports.pdf_generator.BytesIO')
    def test_create_monthly_profit_chart(self, mock_bytesio, mock_plt):
        """Test creating a monthly profit chart."""
        # Set up mock BytesIO
        mock_buffer = MagicMock()
        mock_bytesio.return_value = mock_buffer
        
        # Set up mock figure and axes
        mock_fig = MagicMock()
        mock_ax = MagicMock()
        mock_plt.subplots.return_value = (mock_fig, mock_ax)
        
        # Call the method
        chart_data = self.generator._create_monthly_profit_chart(self.monthly_summary['profit_trend'])
        
        # Verify that the chart was created
        mock_plt.subplots.assert_called_once()
        mock_ax.plot.assert_called_once()
        mock_ax.set_title.assert_called_once()
        mock_fig.savefig.assert_called_once()
        mock_buffer.getvalue.assert_called_once()
    
    @patch('irelandpay_analytics.reports.pdf_generator.plt')
    @patch('irelandpay_analytics.reports.pdf_generator.BytesIO')
    def test_create_top_agents_chart(self, mock_bytesio, mock_plt):
        """Test creating a top agents chart."""
        # Set up mock BytesIO
        mock_buffer = MagicMock()
        mock_bytesio.return_value = mock_buffer
        
        # Set up mock figure and axes
        mock_fig = MagicMock()
        mock_ax = MagicMock()
        mock_plt.subplots.return_value = (mock_fig, mock_ax)
        
        # Call the method
        chart_data = self.generator._create_top_agents_chart(self.monthly_summary['top_agents'])
        
        # Verify that the chart was created
        mock_plt.subplots.assert_called_once()
        mock_ax.bar.assert_called_once()
        mock_ax.set_title.assert_called_once()
        mock_fig.savefig.assert_called_once()
        mock_buffer.getvalue.assert_called_once()
    
    def test_generate_monthly_summary(self):
        """Test generating a monthly summary."""
        # Mock the chart creation methods
        self.generator._create_monthly_volume_chart = MagicMock(return_value=b'volume_chart')
        self.generator._create_monthly_profit_chart = MagicMock(return_value=b'profit_chart')
        self.generator._create_top_agents_chart = MagicMock(return_value=b'agents_chart')
        
        # Call the method
        with patch('builtins.open', mock_open()) as mock_file:
            output_path = self.generator.generate_monthly_summary(self.monthly_summary)
        
        # Verify that the PDF was created
        assert self.mock_pdf.add_page.call_count >= 1
        assert self.mock_pdf.set_font.call_count >= 1
        assert self.mock_pdf.cell.call_count >= 1
        assert self.mock_pdf.output.call_count == 1
        
        # Verify that the charts were created
        self.generator._create_monthly_volume_chart.assert_called_once()
        self.generator._create_monthly_profit_chart.assert_called_once()
        self.generator._create_top_agents_chart.assert_called_once()
        
        # Verify that the output path is correct
        assert 'Monthly_Summary_2023-05.pdf' in output_path
