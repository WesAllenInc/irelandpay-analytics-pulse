"""
IRIS CRM API Client
A custom client for interacting with the IRIS CRM API.
"""
import os
import json
import requests
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Union


class IrelandPayCRMClient:
    """
    Client for interacting with the IRIS CRM API.
    
    This client handles authentication and provides methods for all
    the endpoints we need to replace the Excel upload functionality.
    """
    
    BASE_URL = "https://crm.ireland-pay.com/api/v1"
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize the IRIS CRM client.
        
        Args:
            api_key: The API key for authentication
            base_url: Optional custom base URL
        """
        self.api_key = api_key
        if base_url:
            self.BASE_URL = base_url
        
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
        
        self.logger = logging.getLogger("iriscrm_client")
    
    def _make_request(self, method: str, endpoint: str, params: Dict = None, data: Dict = None) -> Dict:
        """
        Make a request to the IRIS CRM API.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            params: Query parameters
            data: Request body for POST/PUT/PATCH requests
            
        Returns:
            API response as a dict
        """
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=data
            )
            
            response.raise_for_status()
            
            if response.content:
                return response.json()
            return {}
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"API request failed: {str(e)}")
            if hasattr(e, 'response') and e.response:
                self.logger.error(f"Response status: {e.response.status_code}")
                self.logger.error(f"Response body: {e.response.text}")
            
            # Re-raise the exception for the caller to handle
            raise
    
    # Merchant API endpoints
    
    def get_merchants(self, page: int = 1, per_page: int = 100, **filters) -> Dict:
        """
        Get a list of merchants.
        
        Args:
            page: Page number
            per_page: Number of results per page
            **filters: Additional filters to apply
            
        Returns:
            List of merchants
        """
        params = {"page": page, "per_page": per_page, **filters}
        return self._make_request("GET", "/merchants", params=params)
    
    def get_merchant(self, merchant_number: str) -> Dict:
        """
        Get detailed information about a specific merchant.
        
        Args:
            merchant_number: The merchant ID
            
        Returns:
            Merchant details
        """
        return self._make_request("GET", f"/merchants/{merchant_number}")
    
    def get_merchant_transactions(self, merchant_number: str, start_date: str = None, 
                                  end_date: str = None, page: int = 1, per_page: int = 100) -> Dict:
        """
        Get transactions for a merchant.
        
        Args:
            merchant_number: The merchant ID
            start_date: Filter by start date (YYYY-MM-DD)
            end_date: Filter by end date (YYYY-MM-DD)
            page: Page number
            per_page: Number of results per page
            
        Returns:
            List of transactions
        """
        params = {"page": page, "per_page": per_page}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
            
        return self._make_request("GET", f"/merchants/{merchant_number}/transactions", params=params)
    
    def get_merchant_deposits(self, merchant_number: str, year: int, month: int, day: int) -> Dict:
        """
        Get deposit data for a merchant on a specific date.
        
        Args:
            merchant_number: The merchant ID
            year: Year (YYYY)
            month: Month (MM)
            day: Day (DD)
            
        Returns:
            Deposit data
        """
        return self._make_request(
            "GET", 
            f"/merchants/{merchant_number}/deposits/{year}/{month}/{day}"
        )
    
    def get_merchant_statements(self, merchant_number: str) -> Dict:
        """
        Get statements for a merchant.
        
        Args:
            merchant_number: The merchant ID
            
        Returns:
            List of statements
        """
        return self._make_request("GET", f"/merchants/{merchant_number}/statements")
    
    def get_statement(self, merchant_number: str, statement_id: str) -> Dict:
        """
        Get a specific statement for a merchant.
        
        Args:
            merchant_number: The merchant ID
            statement_id: The statement ID
            
        Returns:
            Statement details
        """
        return self._make_request("GET", f"/merchants/{merchant_number}/statements/{statement_id}")
    
    # Residuals API endpoints
    
    def get_residuals_summary(self, year: int, month: int) -> Dict:
        """
        Get residuals summary data.
        
        Args:
            year: Year (YYYY)
            month: Month (MM)
            
        Returns:
            Residuals summary data
        """
        return self._make_request("GET", f"/residuals/reports/summary/{year}/{month}")
    
    def get_residuals_summary_rows(self, processor_id: str, year: int, month: int) -> Dict:
        """
        Get residuals summary with merchant rows.
        
        Args:
            processor_id: The processor ID
            year: Year (YYYY)
            month: Month (MM)
            
        Returns:
            Residuals summary with merchant rows
        """
        return self._make_request(
            "GET", 
            f"/residuals/reports/summary/rows/{processor_id}/{year}/{month}"
        )
    
    def get_residuals_details(self, processor_id: str, year: int, month: int) -> Dict:
        """
        Get detailed residuals data.
        
        Args:
            processor_id: The processor ID
            year: Year (YYYY)
            month: Month (MM)
            
        Returns:
            Detailed residuals data
        """
        return self._make_request(
            "GET", 
            f"/residuals/reports/details/{processor_id}/{year}/{month}"
        )
    
    def get_residuals_lineitems(self, year: int, month: int) -> Dict:
        """
        Get residuals line items.
        
        Args:
            year: Year (YYYY)
            month: Month (MM)
            
        Returns:
            Residuals line items
        """
        return self._make_request("GET", f"/residuals/lineitems/{year}/{month}")
    
    def get_residuals_templates(self) -> Dict:
        """
        Get residuals templates.
        
        Returns:
            Residuals templates
        """
        return self._make_request("GET", "/residuals/templates/")
    
    def get_residuals_templates_assigned(self, year: int, month: int) -> Dict:
        """
        Get users with assigned residuals templates.
        
        Args:
            year: Year (YYYY)
            month: Month (MM)
            
        Returns:
            Users with assigned residuals templates
        """
        return self._make_request("GET", f"/residuals/templates/assigned/{year}/{month}")
