import os
import time
import pytest
import responses
from unittest.mock import patch, MagicMock, call
import json
from datetime import datetime

# Import the module to test
from lib.irelandpay_crm_sync import (
    IrelandPayCRMSyncManager,
    CircuitBreaker,
    RetryableError,
    FatalError,
    IRISCRMError,
    MAX_RETRIES,
    BACKOFF_BASE_MS,
    TIMEOUT_SECONDS
)

# Setup mock environment variables for testing
@pytest.fixture(autouse=True)
def mock_env_vars():
    with patch.dict(os.environ, {
        "IRELANDPAY_CRM_API_KEY": "test_api_key",
        "IRELANDPAY_MAX_RETRIES": "2",
        "IRELANDPAY_BACKOFF_BASE_MS": "10",
        "IRELANDPAY_TIMEOUT_SECONDS": "5",
        "IRELANDPAY_CIRCUIT_MAX_FAILURES": "3",
        "IRELANDPAY_CIRCUIT_RESET_SECONDS": "30"
    }):
        yield

# Mock Supabase client
@pytest.fixture
def mock_supabase():
    mock = MagicMock()
    
    # Setup common methods and returns
    table_mock = MagicMock()
    mock.table.return_value = table_mock
    
    select_mock = MagicMock()
    table_mock.select.return_value = select_mock
    
    eq_mock = MagicMock()
    select_mock.eq.return_value = eq_mock
    
    # Default success response
    eq_mock.execute.return_value = MagicMock(data=[], error=None)
    
    return mock

# Mock IRIS CRM client
@pytest.fixture
def mock_iris_client():
    mock = MagicMock()
    
    # Setup default successful response
    mock.get_merchants.return_value = {
        'data': [
            {'merchantNumber': '12345', 'dbaName': 'Test Merchant 1'},
            {'merchantNumber': '67890', 'dbaName': 'Test Merchant 2'}
        ]
    }
    
    return mock

@pytest.fixture
def sync_manager(mock_supabase, mock_iris_client):
    # Mock the createSupabaseServiceClient and IRISCRMClient
    with patch('lib.irelandpay_crm_sync.createSupabaseServiceClient', return_value=mock_supabase):
        with patch('lib.irelandpay_crm_sync.IrelandPayCRMClient', return_value=mock_iris_client):
            manager = IrelandPayCRMSyncManager()
            # Reset circuit breaker state before each test
            CircuitBreaker._instance = None
            CircuitBreaker._failures = 0
            CircuitBreaker._is_open = False
            CircuitBreaker._last_failure_time = None
            yield manager

# Test retry logic success on second attempt
@responses.activate
@pytest.mark.asyncio
async def test_retry_success_on_second_attempt(sync_manager, mock_iris_client):
    # Setup the mock to fail once then succeed
    mock_iris_client.get_merchants.side_effect = [
        RetryableError("Network error"),
        {'data': [{'merchantNumber': '12345', 'dbaName': 'Test Merchant 1'}]}
    ]
    
    # Execute with resilience should retry and eventually succeed
    result = await sync_manager.sync_merchants()
    
    # Verify function was called twice (original + 1 retry)
    assert mock_iris_client.get_merchants.call_count == 2
    
    # Check that the final result indicates success
    assert result["total_merchants"] == 1
    assert result["merchants_added"] == 1
    assert len(result["errors"]) == 0

# Test circuit breaker opening after max failures
@responses.activate
@pytest.mark.asyncio
async def test_circuit_breaker_opens_after_max_failures(sync_manager, mock_iris_client):
    # Set up the mock to always fail with a retryable error
    mock_iris_client.get_merchants.side_effect = RetryableError("Server error 500")
    
    # Create a custom execute_with_resilience function to track circuit state
    circuit_states = []
    
    # Make multiple calls to observe circuit state changing
    for _ in range(5):  # We expect circuit to open after 3 failures
        try:
            # Call directly to see the circuit behavior
            sync_manager._execute_with_resilience(mock_iris_client.get_merchants)
        except Exception:
            # Just record the circuit state, don't care about exceptions here
            pass
        
        circuit_states.append(CircuitBreaker.getInstance().is_open())
    
    # First calls should show circuit closed, then open
    assert not circuit_states[0]  # First call - circuit closed
    assert not circuit_states[1]  # Second call - circuit closed
    assert circuit_states[3]      # Fourth call - circuit should be open now
    assert circuit_states[4]      # Fifth call - circuit remains open

# Test timeout triggering
@responses.activate
@pytest.mark.asyncio
async def test_timeout_handling(sync_manager, mock_iris_client):
    # Set up the mock to simulate a timeout
    def sleep_then_return(*args, **kwargs):
        time.sleep(0.1)  # Small sleep to simulate timeout
        return {'data': []}
    
    # Mock the timeout duration to be shorter than our sleep for testing purposes
    with patch('lib.iriscrm_sync.TIMEOUT_SECONDS', 0.05):
        mock_iris_client.get_merchants.side_effect = sleep_then_return
        
        # Execute should catch the timeout
        result = await sync_manager.sync_merchants()
        
        # Check the result indicates failure
        assert len(result["errors"]) > 0
        assert "timeout" in str(result["errors"]).lower() or "timed out" in str(result["errors"]).lower()

# Test proper error categorization (retry vs fail immediately)
@pytest.mark.asyncio
async def test_error_categorization(sync_manager):
    # Create test functions that simulate different types of errors
    def raise_retryable_error():
        raise RetryableError("Should retry this")
    
    def raise_fatal_error():
        raise FatalError("Should not retry this")
    
    # Test that retryable errors are retried
    with patch('lib.iriscrm_sync.logger') as mock_logger:
        result = sync_manager._execute_with_resilience(raise_retryable_error)
        # Should log retry attempts
        assert any("retry" in str(call).lower() for call in mock_logger.warning.call_args_list)
    
    # Test that fatal errors fail immediately without retry
    with patch('lib.iriscrm_sync.logger') as mock_logger:
        result = sync_manager._execute_with_resilience(raise_fatal_error)
        # Should not log retry attempts for fatal errors
        assert not any("retry" in str(call).lower() for call in mock_logger.warning.call_args_list)
        assert "invalid" in result["error"].lower()

# Test graceful degradation when API is unavailable
@pytest.mark.asyncio
async def test_graceful_degradation(sync_manager, mock_iris_client):
    # Set up the mock to always fail
    mock_iris_client.get_merchants.side_effect = RetryableError("API unavailable")
    
    # Execute should handle the failure gracefully
    result = await sync_manager.sync_merchants()
    
    # Check we get error details
    assert result["total_merchants"] == 0
    assert len(result["errors"]) > 0
    assert "unavailable" in str(result["errors"]).lower()

if __name__ == "__main__":
    pytest.main(["-v"])
