"""
PDF generator module for creating PDF reports and agent statements.
"""
import logging
import os
from typing import Dict, List, Any, Optional
import pandas as pd
from datetime import datetime
from fpdf import FPDF
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

from irelandpay_analytics.config import settings

logger = logging.getLogger(__name__)

class PDFGenerator:
    """Generates PDF reports and agent statements."""
    
    def __init__(self, output_dir: Optional[Path] = None):
        """
        Initialize the PDF generator.
        
        Args:
            output_dir: Directory to save PDF files (defaults to settings.PROCESSED_DATA_DIR / "reports")
        """
        self.output_dir = output_dir or (settings.PROCESSED_DATA_DIR / "reports")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Initialized PDFGenerator with output directory: {self.output_dir}")
    
    def create_agent_statement(self, agent_name: str, month: str, 
                              agent_data: Dict[str, Any],
                              merchant_data: pd.DataFrame) -> str:
        """
        Create an agent statement PDF.
        
        Args:
            agent_name: Name of the agent
            month: Month in format YYYY-MM
            agent_data: Dictionary with agent summary data
            merchant_data: DataFrame with merchant data for this agent
            
        Returns:
            Path to the generated PDF file
        """
        logger.info(f"Creating agent statement for {agent_name} for {month}")
        
        # Create a PDF object
        pdf = FPDF()
        pdf.add_page()
        
        # Set up fonts
        pdf.set_font("Arial", "B", 16)
        
        # Title
        pdf.cell(0, 10, f"Ireland Pay Agent Statement", ln=True, align="C")
        pdf.cell(0, 10, f"{agent_name} - {month}", ln=True, align="C")
        
        # Agent summary
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 10, "Agent Summary", ln=True)
        
        pdf.set_font("Arial", "", 10)
        pdf.cell(0, 6, f"Total Merchants: {agent_data.get('merchant_count', 0)}", ln=True)
        pdf.cell(0, 6, f"Total Volume: ${agent_data.get('total_volume', 0):,.2f}", ln=True)
        pdf.cell(0, 6, f"Total Earnings: ${agent_data.get('total_earnings', 0):,.2f}", ln=True)
        pdf.cell(0, 6, f"Effective BPS: {agent_data.get('effective_bps', 0):.2f}", ln=True)
        
        # Merchant table
        pdf.ln(10)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 10, "Merchant Details", ln=True)
        
        # Table header
        pdf.set_font("Arial", "B", 8)
        pdf.cell(60, 7, "Merchant Name", border=1)
        pdf.cell(30, 7, "Volume", border=1)
        pdf.cell(30, 7, "Transactions", border=1)
        pdf.cell(30, 7, "BPS", border=1)
        pdf.cell(30, 7, "Earnings", border=1, ln=True)
        
        # Table rows
        pdf.set_font("Arial", "", 8)
        
        # Sort merchants by volume
        merchant_data = merchant_data.sort_values('total_volume', ascending=False)
        
        for _, row in merchant_data.iterrows():
            merchant_name = row.get('merchant_dba', 'Unknown')
            if len(merchant_name) > 25:
                merchant_name = merchant_name[:22] + "..."
                
            volume = row.get('total_volume', 0)
            txns = row.get('total_txns', 0)
            bps = row.get('bps', 0)
            earnings = row.get('earnings', 0)
            
            pdf.cell(60, 6, merchant_name, border=1)
            pdf.cell(30, 6, f"${volume:,.2f}", border=1)
            pdf.cell(30, 6, f"{txns:,}", border=1)
            pdf.cell(30, 6, f"{bps:.2f}", border=1)
            pdf.cell(30, 6, f"${earnings:,.2f}", border=1, ln=True)
        
        # Footer
        pdf.ln(10)
        pdf.set_font("Arial", "I", 8)
        pdf.cell(0, 10, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True)
        pdf.cell(0, 10, "Ireland Pay Analytics", ln=True)
        
        # Save the PDF
        filename = f"{agent_name.replace(' ', '_')}_{month}_statement.pdf"
        filepath = self.output_dir / filename
        pdf.output(str(filepath))
        
        logger.info(f"Agent statement saved to {filepath}")
        return str(filepath)
    
    def create_merchant_report(self, mid: str, merchant_name: str, month: str,
                              merchant_data: Dict[str, Any],
                              historical_data: Optional[pd.DataFrame] = None) -> str:
        """
        Create a merchant report PDF.
        
        Args:
            mid: Merchant ID
            merchant_name: Merchant name
            month: Month in format YYYY-MM
            merchant_data: Dictionary with merchant summary data
            historical_data: Optional DataFrame with historical data for this merchant
            
        Returns:
            Path to the generated PDF file
        """
        logger.info(f"Creating merchant report for {merchant_name} ({mid}) for {month}")
        
        # Create a PDF object
        pdf = FPDF()
        pdf.add_page()
        
        # Set up fonts
        pdf.set_font("Arial", "B", 16)
        
        # Title
        pdf.cell(0, 10, f"Ireland Pay Merchant Report", ln=True, align="C")
        pdf.cell(0, 10, f"{merchant_name} - {month}", ln=True, align="C")
        
        # Merchant summary
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 10, "Merchant Summary", ln=True)
        
        pdf.set_font("Arial", "", 10)
        pdf.cell(0, 6, f"Merchant ID: {mid}", ln=True)
        pdf.cell(0, 6, f"Total Volume: ${merchant_data.get('total_volume', 0):,.2f}", ln=True)
        pdf.cell(0, 6, f"Total Transactions: {merchant_data.get('total_txns', 0):,}", ln=True)
        pdf.cell(0, 6, f"Average Transaction Size: ${merchant_data.get('avg_txn_size', 0):,.2f}", ln=True)
        pdf.cell(0, 6, f"Net Profit: ${merchant_data.get('net_profit', 0):,.2f}", ln=True)
        pdf.cell(0, 6, f"BPS: {merchant_data.get('bps', 0):.2f}", ln=True)
        pdf.cell(0, 6, f"Profit Margin: {merchant_data.get('profit_margin', 0):.2f}%", ln=True)
        
        # Historical chart if data is available
        if historical_data is not None and not historical_data.empty:
            pdf.ln(10)
            pdf.set_font("Arial", "B", 12)
            pdf.cell(0, 10, "Historical Performance", ln=True)
            
            # Create a chart of historical volume
            plt.figure(figsize=(8, 4))
            sns.lineplot(data=historical_data, x='month', y='total_volume')
            plt.title('Monthly Volume')
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            # Save the chart to a temporary file
            chart_path = self.output_dir / f"temp_{mid}_volume_chart.png"
            plt.savefig(chart_path)
            plt.close()
            
            # Add the chart to the PDF
            pdf.image(str(chart_path), x=10, y=None, w=180)
            
            # Remove the temporary file
            os.remove(chart_path)
        
        # Footer
        pdf.ln(10)
        pdf.set_font("Arial", "I", 8)
        pdf.cell(0, 10, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True)
        pdf.cell(0, 10, "Ireland Pay Analytics", ln=True)
        
        # Save the PDF
        filename = f"{mid}_{month}_report.pdf"
        filepath = self.output_dir / filename
        pdf.output(str(filepath))
        
        logger.info(f"Merchant report saved to {filepath}")
        return str(filepath)
    
    def create_monthly_summary(self, month: str, summary_data: Dict[str, Any],
                              agent_data: pd.DataFrame,
                              top_merchants: pd.DataFrame) -> str:
        """
        Create a monthly summary report PDF.
        
        Args:
            month: Month in format YYYY-MM
            summary_data: Dictionary with summary statistics
            agent_data: DataFrame with agent data
            top_merchants: DataFrame with top merchant data
            
        Returns:
            Path to the generated PDF file
        """
        logger.info(f"Creating monthly summary report for {month}")
        
        # Create a PDF object
        pdf = FPDF()
        pdf.add_page()
        
        # Set up fonts
        pdf.set_font("Arial", "B", 16)
        
        # Title
        pdf.cell(0, 10, f"Ireland Pay Monthly Summary", ln=True, align="C")
        pdf.cell(0, 10, f"{month}", ln=True, align="C")
        
        # Overall summary
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 10, "Overall Summary", ln=True)
        
        pdf.set_font("Arial", "", 10)
        pdf.cell(0, 6, f"Total Merchants: {summary_data.get('merchant_count', 0):,}", ln=True)
        pdf.cell(0, 6, f"Total Agents: {summary_data.get('agent_count', 0):,}", ln=True)
        pdf.cell(0, 6, f"Total Volume: ${summary_data.get('total_volume', 0):,.2f}", ln=True)
        pdf.cell(0, 6, f"Total Transactions: {summary_data.get('total_txns', 0):,}", ln=True)
        pdf.cell(0, 6, f"Total Profit: ${summary_data.get('total_profit', 0):,.2f}", ln=True)
        
        # Month-over-month changes
        if 'volume_change_pct' in summary_data:
            pdf.ln(5)
            pdf.set_font("Arial", "B", 10)
            pdf.cell(0, 8, "Month-over-Month Changes", ln=True)
            
            pdf.set_font("Arial", "", 10)
            pdf.cell(0, 6, f"Volume Change: {summary_data.get('volume_change_pct', 0):.2f}%", ln=True)
            pdf.cell(0, 6, f"Profit Change: {summary_data.get('profit_change_pct', 0):.2f}%", ln=True)
            pdf.cell(0, 6, f"Merchant Count Change: {summary_data.get('merchant_count_change', 0):+,}", ln=True)
        
        # Top agents table
        pdf.ln(10)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 10, "Top Agents", ln=True)
        
        # Table header
        pdf.set_font("Arial", "B", 8)
        pdf.cell(60, 7, "Agent Name", border=1)
        pdf.cell(30, 7, "Merchants", border=1)
        pdf.cell(40, 7, "Volume", border=1)
        pdf.cell(40, 7, "Earnings", border=1, ln=True)
        
        # Table rows
        pdf.set_font("Arial", "", 8)
        
        # Sort agents by earnings
        agent_data = agent_data.sort_values('total_earnings', ascending=False).head(10)
        
        for _, row in agent_data.iterrows():
            agent_name = row.get('agent_name', 'Unknown')
            if len(agent_name) > 25:
                agent_name = agent_name[:22] + "..."
                
            merchant_count = row.get('merchant_count', 0)
            volume = row.get('total_volume', 0)
            earnings = row.get('total_earnings', 0)
            
            pdf.cell(60, 6, agent_name, border=1)
            pdf.cell(30, 6, f"{merchant_count:,}", border=1)
            pdf.cell(40, 6, f"${volume:,.2f}", border=1)
            pdf.cell(40, 6, f"${earnings:,.2f}", border=1, ln=True)
        
        # Top merchants table
        pdf.ln(10)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 10, "Top Merchants by Volume", ln=True)
        
        # Table header
        pdf.set_font("Arial", "B", 8)
        pdf.cell(60, 7, "Merchant Name", border=1)
        pdf.cell(40, 7, "Volume", border=1)
        pdf.cell(30, 7, "Transactions", border=1)
        pdf.cell(30, 7, "Profit", border=1, ln=True)
        
        # Table rows
        pdf.set_font("Arial", "", 8)
        
        # Sort merchants by volume
        top_merchants = top_merchants.sort_values('total_volume', ascending=False).head(10)
        
        for _, row in top_merchants.iterrows():
            merchant_name = row.get('merchant_dba', 'Unknown')
            if len(merchant_name) > 25:
                merchant_name = merchant_name[:22] + "..."
                
            volume = row.get('total_volume', 0)
            txns = row.get('total_txns', 0)
            profit = row.get('net_profit', 0)
            
            pdf.cell(60, 6, merchant_name, border=1)
            pdf.cell(40, 6, f"${volume:,.2f}", border=1)
            pdf.cell(30, 6, f"{txns:,}", border=1)
            pdf.cell(30, 6, f"${profit:,.2f}", border=1, ln=True)
        
        # Footer
        pdf.ln(10)
        pdf.set_font("Arial", "I", 8)
        pdf.cell(0, 10, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True)
        pdf.cell(0, 10, "Ireland Pay Analytics", ln=True)
        
        # Save the PDF
        filename = f"monthly_summary_{month}.pdf"
        filepath = self.output_dir / filename
        pdf.output(str(filepath))
        
        logger.info(f"Monthly summary report saved to {filepath}")
        return str(filepath)
