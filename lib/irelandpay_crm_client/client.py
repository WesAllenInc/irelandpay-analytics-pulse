"""
Ireland Pay CRM API Client
A custom client for interacting with the Ireland Pay CRM API.
"""
import os
import json
import requests
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Union


class IrelandPayCRMClient:
    """
    Client for interacting with the Ireland Pay CRM API.
    
    This client handles authentication and provides methods for all
    the endpoints we need to replace the Excel upload functionality.
    """
    
    BASE_URL = "https://crm.ireland-pay.com/api/v1"
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize the Ireland Pay CRM client.
        
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
        
        self.logger = logging.getLogger("irelandpay_crm_client")
    
    def _make_request(self, method: str, endpoint: str, params: Dict = None, data: Dict = None) -> Dict:
        """
        Make a request to the Ireland Pay CRM API.
        
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
    
    def update_merchant(self, merchant_number: str, data: Dict) -> Dict:
        """
        Update an existing merchant.
        
        Args:
            merchant_number: The merchant ID
            data: Merchant data to update
            
        Returns:
            Updated merchant details
        """
        return self._make_request("PATCH", f"/merchants/{merchant_number}", data=data)
    
    def get_merchant_transactions(self, merchant_number: str, start_date: str = None, 
                                end_date: str = None, page: int = 1, per_page: int = 100) -> Dict:
        """
        Get a list of batches and transactions for a merchant.
        
        Args:
            merchant_number: The merchant ID
            start_date: Start date filter (optional)
            end_date: End date filter (optional)
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
    
    def get_merchant_chargebacks(self, merchant_number: str, page: int = 1, per_page: int = 100) -> Dict:
        """
        Get a list of chargebacks for a merchant.
        
        Args:
            merchant_number: The merchant ID
            page: Page number
            per_page: Number of results per page
            
        Returns:
            List of chargebacks
        """
        params = {"page": page, "per_page": per_page}
        return self._make_request("GET", f"/merchants/{merchant_number}/chargebacks", params=params)
    
    def get_merchant_retrievals(self, merchant_number: str, page: int = 1, per_page: int = 100) -> Dict:
        """
        Get a list of retrievals for a merchant.
        
        Args:
            merchant_number: The merchant ID
            page: Page number
            per_page: Number of results per page
            
        Returns:
            List of retrievals
        """
        params = {"page": page, "per_page": per_page}
        return self._make_request("GET", f"/merchants/{merchant_number}/retrievals", params=params)
    
    def get_merchant_statements(self, merchant_number: str, page: int = 1, per_page: int = 100) -> Dict:
        """
        Get a list of statements for a merchant.
        
        Args:
            merchant_number: The merchant ID
            page: Page number
            per_page: Number of results per page
            
        Returns:
            List of statements
        """
        params = {"page": page, "per_page": per_page}
        return self._make_request("GET", f"/merchants/{merchant_number}/statements", params=params)
    
    def download_statement(self, merchant_number: str, statement_id: str) -> bytes:
        """
        Download a statement for a merchant.
        
        Args:
            merchant_number: The merchant ID
            statement_id: The statement ID
            
        Returns:
            Statement file content
        """
        url = f"{self.BASE_URL}/merchants/{merchant_number}/statements/{statement_id}"
        
        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.content
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Statement download failed: {str(e)}")
            raise
    
    # Residuals API endpoints
    
    def get_residuals_summary(self, year: int, month: int) -> Dict:
        """
        Get residuals summary data.
        
        Args:
            year: Year
            month: Month
            
        Returns:
            Residuals summary data
        """
        return self._make_request("GET", f"/residuals/reports/summary/{year}/{month}")
    
    def get_residuals_summary_with_rows(self, processor_id: str, year: int, month: int) -> Dict:
        """
        Get residuals summary with merchant rows.
        
        Args:
            processor_id: Processor ID
            year: Year
            month: Month
            
        Returns:
            Residuals summary with merchant rows
        """
        return self._make_request("GET", f"/residuals/reports/summary/rows/{processor_id}/{year}/{month}")
    
    def get_residuals_details(self, processor_id: str, year: int, month: int) -> Dict:
        """
        Get residuals details with merchant rows.
        
        Args:
            processor_id: Processor ID
            year: Year
            month: Month
            
        Returns:
            Residuals details with merchant rows
        """
        return self._make_request("GET", f"/residuals/reports/details/{processor_id}/{year}/{month}")
    
    def get_residuals_lineitems(self, year: int, month: int) -> Dict:
        """
        Get residuals line items.
        
        Args:
            year: Year
            month: Month
            
        Returns:
            Residuals line items
        """
        return self._make_request("GET", f"/residuals/lineitems/{year}/{month}")
    
    def get_residuals_templates(self) -> Dict:
        """
        Get residuals templates.
        
        Returns:
            List of residuals templates
        """
        return self._make_request("GET", "/residuals/templates")
    
    def get_assigned_residuals_templates(self, year: int, month: int) -> Dict:
        """
        Get a list of users with assigned residuals templates.
        
        Args:
            year: Year
            month: Month
            
        Returns:
            List of users with assigned templates
        """
        return self._make_request("GET", f"/residuals/templates/assigned/{year}/{month}")
    
    # Lead API endpoints
    
    def get_leads(self, page: int = 1, per_page: int = 100, **filters) -> Dict:
        """
        Get a list of leads.
        
        Args:
            page: Page number
            per_page: Number of results per page
            **filters: Additional filters to apply
            
        Returns:
            List of leads
        """
        params = {"page": page, "per_page": per_page, **filters}
        return self._make_request("GET", "/leads", params=params)
    
    def get_lead(self, lead_id: str) -> Dict:
        """
        Get detailed information about a specific lead.
        
        Args:
            lead_id: The lead ID
            
        Returns:
            Lead details
        """
        return self._make_request("GET", f"/leads/{lead_id}")
    
    def create_lead(self, data: Dict) -> Dict:
        """
        Create a new lead.
        
        Args:
            data: Lead data
            
        Returns:
            Created lead details
        """
        return self._make_request("POST", "/leads", data=data)
    
    def update_lead(self, lead_id: str, data: Dict) -> Dict:
        """
        Update a lead.
        
        Args:
            lead_id: The lead ID
            data: Lead data to update
            
        Returns:
            Updated lead details
        """
        return self._make_request("PATCH", f"/leads/{lead_id}", data=data)
    
    def get_lead_tab_fields(self, lead_id: str, tab_id: str) -> Dict:
        """
        Get lead information from a specific tab.
        
        Args:
            lead_id: The lead ID
            tab_id: The tab ID
            
        Returns:
            Lead tab fields
        """
        return self._make_request("GET", f"/leads/{lead_id}/tabs/{tab_id}/fields")
    
    # Helpdesk API endpoints
    
    def get_helpdesk_tickets(self, page: int = 1, per_page: int = 100, **filters) -> Dict:
        """
        Get a list of helpdesk tickets.
        
        Args:
            page: Page number
            per_page: Number of results per page
            **filters: Additional filters to apply
            
        Returns:
            List of helpdesk tickets
        """
        params = {"page": page, "per_page": per_page, **filters}
        return self._make_request("GET", "/helpdesk", params=params)
    
    def get_helpdesk_ticket(self, ticket_id: str) -> Dict:
        """
        Get detailed ticket information.
        
        Args:
            ticket_id: The ticket ID
            
        Returns:
            Ticket details
        """
        return self._make_request("GET", f"/helpdesk/{ticket_id}")
    
    def create_helpdesk_ticket(self, data: Dict) -> Dict:
        """
        Create a new ticket.
        
        Args:
            data: Ticket data
            
        Returns:
            Created ticket details
        """
        return self._make_request("POST", "/helpdesk", data=data)
    
    def update_helpdesk_ticket(self, ticket_id: str, data: Dict) -> Dict:
        """
        Update a ticket.
        
        Args:
            ticket_id: The ticket ID
            data: Ticket data to update
            
        Returns:
            Updated ticket details
        """
        return self._make_request("PATCH", f"/helpdesk/{ticket_id}", data=data)
    
    def delete_helpdesk_ticket(self, ticket_id: str) -> Dict:
        """
        Delete a ticket.
        
        Args:
            ticket_id: The ticket ID
            
        Returns:
            Deletion result
        """
        return self._make_request("DELETE", f"/helpdesk/{ticket_id}")
    
    def add_ticket_comment(self, ticket_id: str, data: Dict) -> Dict:
        """
        Add a ticket comment.
        
        Args:
            ticket_id: The ticket ID
            data: Comment data
            
        Returns:
            Created comment details
        """
        return self._make_request("POST", f"/helpdesk/{ticket_id}/comment", data=data)
    
    # E-Signature API endpoints
    
    def generate_esignature_document(self, lead_id: str, application_id: str, data: Dict) -> Dict:
        """
        Generate an e-signature document.
        
        Args:
            lead_id: The lead ID
            application_id: The application ID
            data: Document generation data
            
        Returns:
            Generated document details
        """
        return self._make_request("POST", f"/leads/{lead_id}/signatures/{application_id}/generate", data=data)
    
    def send_esignature_document(self, lead_id: str, application_id: str, data: Dict) -> Dict:
        """
        Send an e-signature document.
        
        Args:
            lead_id: The lead ID
            application_id: The application ID
            data: Document sending data
            
        Returns:
            Document sending result
        """
        return self._make_request("POST", f"/leads/{lead_id}/signatures/{application_id}/send", data=data)
    
    def download_esignature_document(self, application_id: str) -> bytes:
        """
        Download an e-signature document.
        
        Args:
            application_id: The application ID
            
        Returns:
            Document file content
        """
        url = f"{self.BASE_URL}/leads/signatures/{application_id}/download"
        
        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.content
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"E-signature document download failed: {str(e)}")
            raise
    
    def get_lead_signatures(self, lead_id: str) -> Dict:
        """
        Get a list of all lead e-signatures documents.
        
        Args:
            lead_id: The lead ID
            
        Returns:
            List of e-signature documents
        """
        return self._make_request("GET", f"/leads/{lead_id}/signatures")
    
    def get_applications(self) -> Dict:
        """
        Get a list of available applications.
        
        Returns:
            List of applications
        """
        return self._make_request("GET", "/leads/applications")
    
    # Web Forms API endpoints
    
    def get_webforms(self, page: int = 1, per_page: int = 100, **filters) -> Dict:
        """
        Get a list of web forms.
        
        Args:
            page: Page number
            per_page: Number of results per page
            **filters: Additional filters to apply
            
        Returns:
            List of web forms
        """
        params = {"page": page, "per_page": per_page, **filters}
        return self._make_request("GET", "/webforms", params=params)
    
    def generate_webform(self, lead_id: str, webform_default_id: str, data: Dict) -> Dict:
        """
        Generate a web form from lead.
        
        Args:
            lead_id: The lead ID
            webform_default_id: The web form default ID
            data: Web form generation data
            
        Returns:
            Generated web form details
        """
        return self._make_request("POST", f"/leads/{lead_id}/webforms/{webform_default_id}/generate", data=data)
    
    def send_webform(self, lead_id: str, webform_session_id: str, data: Dict) -> Dict:
        """
        Send a web form from lead.
        
        Args:
            lead_id: The lead ID
            webform_session_id: The web form session ID
            data: Web form sending data
            
        Returns:
            Web form sending result
        """
        return self._make_request("POST", f"/leads/{lead_id}/webforms/{webform_session_id}/send", data=data)
    
    def get_lead_webforms(self, lead_id: str) -> Dict:
        """
        Get a list of all lead web forms.
        
        Args:
            lead_id: The lead ID
            
        Returns:
            List of web forms
        """
        return self._make_request("GET", f"/leads/{lead_id}/webforms") 