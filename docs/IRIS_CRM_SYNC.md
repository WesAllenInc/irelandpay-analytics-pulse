# IRIS CRM Sync Integration

This document describes the implementation of the IRIS CRM synchronization in the Ireland Pay Analytics portal, including the resilience features and configuration options.

## Overview

The IRIS CRM integration synchronizes merchant data, residuals, and processing volumes from IRIS CRM to the Ireland Pay Analytics database. The integration is implemented in both Python (backend services) and TypeScript (NextJS API routes).

## Resilience Features

The IRIS CRM integration includes several resilience features to handle API instability, network issues, and other potential failures:

### 1. Exponential Backoff Retry

All API calls are wrapped in a retry mechanism that uses exponential backoff. This means that if a request fails due to a retryable error, the system will automatically retry with increasing delays between attempts.

- **Default Configuration**: 3 retry attempts with delays of 1s, 2s, and 4s
- **Configurable via**: `IRIS_MAX_RETRIES` and `IRIS_BACKOFF_BASE_MS` environment variables

### 2. Circuit Breaker Pattern

To prevent overwhelming the IRIS CRM API during outages, a circuit breaker pattern is implemented. After a certain number of consecutive failures, the circuit "opens" and fails fast for a period before attempting to reset.

- **Default Configuration**: Opens after 5 consecutive failures, resets after 60 seconds
- **Configurable via**: `IRIS_CIRCUIT_MAX_FAILURES` and `IRIS_CIRCUIT_RESET_SECONDS` environment variables

### 3. Error Categorization

Not all errors should be treated the same way. The system categorizes errors into:

- **Retryable Errors**: Temporary issues like network problems or HTTP 5xx server errors
- **Fatal Errors**: Permanent issues like HTTP 4xx client errors (bad request, unauthorized, etc.)

### 4. Request Timeouts

To prevent operations from hanging indefinitely, all requests have a timeout limit:

- **Default Configuration**: 30 seconds
- **Configurable via**: `IRIS_TIMEOUT_SECONDS` (Python) or `IRIS_TIMEOUT_MS` (TypeScript) environment variables

### 5. Graceful Degradation

When the API is unavailable (circuit open or all retries failed), the system degrades gracefully by returning structured error responses that can be handled by the UI:

- API routes return HTTP 503 Service Unavailable with `{ error: "IRIS API unavailable" }`
- Background jobs log errors and continue with partial data when possible

## Configuration Parameters

All resilience features can be tuned via environment variables:

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `IRIS_MAX_RETRIES` | `3` | Maximum number of retry attempts for failed operations |
| `IRIS_BACKOFF_BASE_MS` | `1000` | Base delay in milliseconds for exponential backoff (e.g., 1000ms → 1s, 2s, 4s delays) |
| `IRIS_TIMEOUT_SECONDS` | `30` | Request timeout in seconds (Python) |
| `IRIS_TIMEOUT_MS` | `30000` | Request timeout in milliseconds (TypeScript) |
| `IRIS_CIRCUIT_MAX_FAILURES` | `5` | Number of consecutive failures needed to open the circuit breaker |
| `IRIS_CIRCUIT_RESET_SECONDS` | `60` | Time in seconds after which to reset (close) the circuit breaker |

## Tuning Recommendations

### For Production Environments

#### High-Availability Scenarios
- **Heavy Traffic**: Increase `IRIS_CIRCUIT_MAX_FAILURES` to 8-10 and `IRIS_CIRCUIT_RESET_SECONDS` to 120 to prevent premature circuit opening during traffic spikes
- **Critical Operations**: Set `IRIS_MAX_RETRIES` to 5 and `IRIS_BACKOFF_BASE_MS` to 2000 for more aggressive recovery attempts with longer cool-down periods
- **Rate-Limited APIs**: Increase `IRIS_BACKOFF_BASE_MS` to 3000+ to respect potential rate limits (resulting in delays of 3s, 6s, 12s, etc.)

#### Stability-Focused Scenarios
- **API with Known Instability**: Reduce `IRIS_CIRCUIT_MAX_FAILURES` to 3 and increase `IRIS_CIRCUIT_RESET_SECONDS` to 300 for quicker circuit opening and longer cool-down
- **Latency-Sensitive**: Lower `IRIS_TIMEOUT_MS` to 15000 (15s) to fail faster when API is unresponsive
- **Resource-Constrained**: Keep `IRIS_MAX_RETRIES` at 2-3 to avoid overwhelming systems during recovery

#### Scaling Considerations
- For systems with >10 requests/second to IRIS CRM, consider implementing a global rate limiter in addition to these resilience patterns
- Scale `IRIS_CIRCUIT_RESET_SECONDS` proportionally with your service's recovery time objectives (RTO)

### For Development/Testing

- **Fast Feedback**: Set `IRIS_MAX_RETRIES=1`, `IRIS_TIMEOUT_SECONDS=5`, `IRIS_CIRCUIT_MAX_FAILURES=2` for quick failure detection
- **API Simulation**: For testing resilience patterns locally, use `IRIS_CIRCUIT_RESET_SECONDS=10` to simulate rapid circuit breaker cycling
- **Load Testing**: Set failure thresholds progressively (start at `IRIS_CIRCUIT_MAX_FAILURES=2` and increase) to determine optimal settings for your traffic patterns

### Monitoring-Based Tuning

Adjust these parameters based on observed metrics:

1. **High retry count with eventual success**: Increase `IRIS_BACKOFF_BASE_MS` but maintain retry count
2. **High percentage of timeout errors**: Decrease `IRIS_TIMEOUT_MS/SECONDS` or investigate API performance issues
3. **Circuit frequently opening/closing**: Increase `IRIS_CIRCUIT_MAX_FAILURES` to be more tolerant of intermittent failures
4. **Long recovery periods after failures**: Reduce `IRIS_CIRCUIT_RESET_SECONDS` to test recovery more aggressively

> **Note**: All tuning should be based on measured performance data. Collect metrics on retry counts, timeout frequencies, and circuit breaker state changes to make data-driven tuning decisions.

## Observability

The implementation logs all retry attempts, circuit state changes, timeouts, and final failures:

- Python: Uses the standard logging module with configurable levels
- TypeScript: Uses console.log/warn/error with structured information

Consider adding metrics collection for:
- Retry counts
- Circuit open/close events
- Success/failure rates

## Implementation Details

### Python Implementation

Located in `lib/iriscrm_sync.py`:
- Uses `tenacity` library for retries
- Implements a singleton `CircuitBreaker` class
- Wraps API calls in an `_execute_with_resilience` method

### TypeScript Implementation

Located in `app/api/sync-iriscrm/route.ts`:
- Uses `p-retry` library for retries
- Custom `CircuitBreaker` class implementation
- Wraps API and database calls in `executeWithResilience` function

## Testing

Unit tests are provided for both implementations:

- Python: `tests/test_iriscrm_sync.py` using pytest and responses library
- TypeScript: `__tests__/resilient-iriscrm-sync.test.ts` using Vitest

The tests cover:
- Retry success scenarios
- Circuit breaker state changes
- Timeout handling
- Error categorization
