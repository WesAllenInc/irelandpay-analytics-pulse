# Ireland Pay Analytics Testing Plan

This document outlines the comprehensive testing strategy for the Ireland Pay Analytics project, focusing on the Excel upload pipeline, data transformation, and Supabase integration.

## 1. Backend Testing

### 1.1 DataTransformer Unit Tests (`simple_test.py`)

These tests verify the core functionality of the `DataTransformer` class:

- **normalize_column_names**: Tests column name normalization for both merchant and residual data
- **clean_merchant_data**: Tests data cleaning, standardization, and validation
- **clean_residual_data**: Tests residual data cleaning and formatting
- **transform_data**: Tests data transformation for both merchant and residual datasets
- **merge_merchant_residual_data**: Tests merging of merchant and residual data with profit margin calculation

**How to run:**
```bash
python simple_test.py
```

### 1.2 Backend Integration Tests (`transformer-integration.test.ts`)

These tests verify the integration between the DataTransformer and the rest of the system:

- Processing merchant data through the transformation pipeline
- Processing residual data through the transformation pipeline
- Merging merchant and residual data correctly
- Handling edge cases in profit margin calculation
- Handling missing residual data when merging

**How to run:**
```bash
npx vitest run tests/backend/transformer-integration.test.ts
```

## 2. Frontend Component Testing

### 2.1 UploadExcel Component Tests (`UploadExcel.test.tsx`)

Tests for the `UploadExcel` React component:

- File selection and validation (size and format)
- Upload flow with mocked Supabase Storage
- Dataset type selection (merchants vs residuals)
- Error handling and user feedback
- Interaction with the ExcelUploadStatus component

**How to run:**
```bash
npx vitest run tests/components/UploadExcel.test.tsx
```

### 2.2 ExcelUploadStatus Component Tests (`ExcelUploadStatus.test.tsx`)

Tests for the `ExcelUploadStatus` React component:

- Rendering of all status states (uploading, processing, success, error)
- Proper display of file info and processing results
- Toast notification triggering on success or error
- Close button functionality

**How to run:**
```bash
npx vitest run tests/components/ExcelUploadStatus.test.tsx
```

## 3. Integration Testing

### 3.1 Excel Upload Pipeline Tests (`excel-upload-pipeline.test.ts`)

Tests for the complete Excel upload and processing pipeline:

- Uploading merchant Excel files to Supabase Storage
- Uploading residual Excel files to Supabase Storage
- Processing Excel files through the API
- Merging merchant and residual data
- Error handling during file processing

**How to run:**
```bash
npx vitest run tests/excel-upload-pipeline.test.ts
```

### 3.2 Edge Function Tests (`edge-function-process-excel.test.ts`)

Tests for the Supabase Edge Function that processes Excel files:

- Downloading files from Supabase Storage
- Parsing Excel data
- Transforming data using DataTransformer
- Inserting data into Supabase tables
- Error handling for various failure scenarios

**How to run:**
```bash
npx vitest run tests/edge-function-process-excel.test.ts
```

## 4. Test Environment Setup

### 4.1 Vitest Configuration

The project uses Vitest with the following configuration:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    environment: 'node', // Use 'jsdom' for React component tests if available
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    },
  },
});
```

### 4.2 Test Setup File

The setup file configures the test environment:

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock browser APIs and globals needed for tests
```

### 4.3 Required Dependencies

- Vitest
- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event
- @vitejs/plugin-react
- jsdom (for React component tests)

## 5. Mocking Strategy

### 5.1 Supabase Mocks

```typescript
// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  // Implementation of mock Supabase client
});
```

### 5.2 Excel Parsing Mocks

```typescript
// Mock XLSX library
vi.mock('xlsx', () => {
  // Implementation of mock XLSX library
});
```

### 5.3 DataTransformer Mocks

```typescript
// Mock DataTransformer class
class MockDataTransformer {
  // Implementation of mock methods
}
```

## 6. Test Coverage Goals

- **Backend Logic**: 90%+ coverage of the DataTransformer class
- **Frontend Components**: 80%+ coverage of the UploadExcel and ExcelUploadStatus components
- **API Routes**: 80%+ coverage of the Excel processing API routes
- **Edge Functions**: 80%+ coverage of the Supabase Edge Functions

## 7. CI/CD Integration

Future steps for CI/CD integration:

1. Add GitHub Actions workflow to run tests on push and pull requests
2. Configure test reporting to track coverage over time
3. Add status checks to prevent merging PRs with failing tests

## 8. Manual Testing Checklist

- [ ] Upload merchant Excel file through UI
- [ ] Upload residual Excel file through UI
- [ ] Verify data appears in Supabase tables
- [ ] Verify merged data calculations
- [ ] Test error handling with invalid files
- [ ] Test file size limits

## 9. Known Issues and Limitations

- Tests rely on mocks for Supabase and XLSX; real integration tests with live Supabase could be added later
- Browser-specific behavior testing requires jsdom environment
- End-to-end tests with Playwright or Cypress would provide additional confidence

## 10. Next Steps

1. Run and validate all tests in local environment
2. Expand frontend tests to cover additional edge cases
3. Add end-to-end tests for the full user flow
4. Integrate tests into CI/CD pipeline
5. Document test coverage and results
