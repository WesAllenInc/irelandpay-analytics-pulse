/**
 * End-to-end test for the Ireland Pay Analytics Pipeline
 * 
 * This test covers the complete flow:
 * 1. Upload a test Excel file through the frontend
 * 2. Trigger pipeline processing
 * 3. Verify data appears in the dashboard
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const TEST_TIMEOUT = 60000; // 1 minute timeout for pipeline processing
const POLL_INTERVAL = 1000; // 1 second between status checks

// Create a simple test Excel file with predictable data
function createTestExcelFile() {
  // For a real implementation, we would use a library like exceljs to create an actual Excel file
  // For this test stub, we'll assume the file already exists in the fixtures directory
  const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
  
  // Ensure fixtures directory exists
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  
  // In a real implementation, generate the test Excel file here
  console.log('Test Excel file preparation would happen here');
  
  return path.join(fixturesDir, 'test_residuals.xlsx');
}

test.describe('Analytics Pipeline E2E', () => {
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  
  // Admin login helper
  async function adminLogin(page) {
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_ADMIN_EMAIL || '');
    await page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD || '');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Verify we're logged in by checking for admin elements
    await expect(page.locator('.user-role-badge')).toContainText('Admin');
  }
  
  test('Upload residuals, trigger pipeline, verify dashboard data', async ({ page }) => {
    // Create or ensure test data exists
    const testFilePath = createTestExcelFile();
    
    // Step 1: Login as admin
    await adminLogin(page);
    
    // Step 2: Navigate to upload page
    await page.goto('/upload-residuals');
    
    // Step 3: Upload test file
    await page.setInputFiles('input[type="file"]', testFilePath);
    await page.click('button:has-text("Upload and Process")');
    
    // Step 4: Wait for upload confirmation
    await expect(page.locator('.alert')).toContainText('Successfully processed', { timeout: 10000 });
    
    // Extract key information from the success message
    const alertText = await page.locator('.alert').textContent();
    console.log(`Upload result: ${alertText}`);
    
    // Step 5: Trigger pipeline run via API
    await page.goto('/admin/run-pipeline');
    await page.click('button:has-text("Run Pipeline")');
    
    // Step 6: Get the pipeline run ID from the UI
    const runIdElement = await page.waitForSelector('[data-testid="run-id"]', { timeout: 5000 });
    const runId = await runIdElement.textContent() || 'unknown-run-id';
    console.log(`Pipeline run initiated with ID: ${runId}`);
    
    // Step 7: Poll for pipeline completion
    const maxRetries = 20;
    let retries = 0;
    let pipelineComplete = false;
    
    test.setTimeout(TEST_TIMEOUT);
    
    while (retries < maxRetries && !pipelineComplete) {
      const { data, error } = await supabase
        .from('pipeline_runs')
        .select('status')
        .eq('id', runId)
        .single();
      
      if (error) {
        console.error(`Error checking pipeline status: ${error.message}`);
      }
      
      if (data && data.status === 'completed') {
        pipelineComplete = true;
        console.log('Pipeline completed successfully');
      } else if (data && data.status === 'failed') {
        throw new Error(`Pipeline failed: ${JSON.stringify(data)}`);
      } else {
        console.log(`Waiting for pipeline completion, status: ${data?.status || 'unknown'}`);
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        retries++;
      }
    }
    
    expect(pipelineComplete, 'Pipeline should complete within the timeout period').toBeTruthy();
    
    // Step 8: Navigate to dashboard and verify data is present
    await page.goto('/admin/agent-payouts');
    await page.waitForSelector('.merchant-table', { timeout: 5000 });
    
    // Verify test merchant data appears in table
    await expect(page.locator('.merchant-table')).toContainText('Test Merchant');
    
    // Verify calculations are correct (values should match test data)
    const residualCell = page.locator('[data-testid="residual-amount-TestMerchantID"]');
    await expect(residualCell).toContainText('250.00');
    
    // Verify totals are updated correctly
    const totalVolumeElement = page.locator('[data-testid="total-volume"]');
    await expect(totalVolumeElement).toBeVisible();
    const volumeText = await totalVolumeElement.textContent();
    const volume = parseFloat(volumeText.replace(/[^0-9.]/g, ''));
    
    // Volume should be greater than zero if pipeline processed correctly
    expect(volume).toBeGreaterThan(0);
  });
  
  test('Pipeline API authentication protection', async ({ page, request }) => {
    // Test that the pipeline API endpoint is protected
    const response = await request.post('/api/run-analytics', {});
    expect(response.status()).toBe(403); // Should be forbidden without auth
    
    // Test with invalid token
    const responseWithBadToken = await request.post('/api/run-analytics', {
      headers: {
        Authorization: 'Bearer invalid-token'
      }
    });
    expect(responseWithBadToken.status()).toBe(403);
    
    // Only admins should be able to access the pipeline run page
    await page.goto('/login');
    
    // Login as a non-admin user (would need to create test accounts with different roles)
    await page.fill('[name="email"]', process.env.TEST_NON_ADMIN_EMAIL || '');
    await page.fill('[name="password"]', process.env.TEST_NON_ADMIN_PASSWORD || '');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Try to access the admin page, should be redirected or denied
    await page.goto('/admin/run-pipeline');
    
    // Should not have access to run the pipeline
    const runButtonExists = await page.locator('button:has-text("Run Pipeline")').count() > 0;
    expect(runButtonExists).toBe(false);
  });
});
