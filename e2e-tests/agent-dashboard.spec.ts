import { test, expect } from '@playwright/test';

// Test suite for the Agent Dashboard page
test.describe('Agent Dashboard', () => {
  // Before all tests, make sure we're logged in
  test.beforeAll(async ({ browser }) => {
    // Create a new context and page
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login first (this could be extracted to a helper function)
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD || 'password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Wait for login to complete and store the authenticated state
    await page.waitForURL('/dashboard');
    await context.storageState({ path: 'playwright/.auth/agent-user.json' });
    await context.close();
  });

  // Use the authenticated context for all tests
  test.use({ storageState: 'playwright/.auth/agent-user.json' });

  test.beforeEach(async ({ page }) => {
    // Navigate to the agent dashboard page before each test
    await page.goto('/agent');
  });

  test('loads agent dashboard with key metrics', async ({ page }) => {
    // Check that the page has loaded with the correct title
    await expect(page.getByRole('heading', { name: /Agent Dashboard/i })).toBeVisible();
    
    // Check for key dashboard elements
    await expect(page.getByText(/Active Merchants/i)).toBeVisible();
    await expect(page.getByText(/MTD Processing Volume/i)).toBeVisible();
    await expect(page.getByText(/MTD Residual Earnings/i)).toBeVisible();
    
    // Check that the merchant table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Check that the volume trend chart is visible
    // This will depend on the chart implementation, but we can check for chart container
    await expect(page.locator('[data-testid="agent-volume-chart"]')).toBeVisible();
  });

  test('month selector changes the displayed data', async ({ page }) => {
    // Find and click the month selector
    const monthSelector = page.getByRole('combobox');
    await expect(monthSelector).toBeVisible();
    
    // Get the current values for comparison
    const currentVolume = await page.locator('[data-testid="mtd-volume"]').innerText();
    const currentResiduals = await page.locator('[data-testid="mtd-residuals"]').innerText();
    
    // Change the month
    await monthSelector.click();
    await page.getByRole('option').nth(1).click(); // Select a different month
    
    // Wait for data to update
    await page.waitForTimeout(1000); // This is just for demonstration; better to wait for specific changes
    
    // Check that the data has changed
    const newVolume = await page.locator('[data-testid="mtd-volume"]').innerText();
    const newResiduals = await page.locator('[data-testid="mtd-residuals"]').innerText();
    
    // The values should be different after changing months (this test could be flaky if data is the same)
    expect(newVolume).not.toBe(currentVolume);
    expect(newResiduals).not.toBe(currentResiduals);
  });

  test('merchant table contains expected columns', async ({ page }) => {
    const table = page.locator('table');
    
    // Check that the table has the expected column headers
    await expect(table.getByRole('columnheader', { name: /Merchant Name/i })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: /MID/i })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: /Volume/i })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: /BPS/i })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: /Residual/i })).toBeVisible();
  });

  test('csv export button generates a download', async ({ page }) => {
    // Find the export button
    const exportButton = page.getByRole('button', { name: /Export CSV/i });
    await expect(exportButton).toBeVisible();
    
    // Start waiting for the download before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click the export button
    await exportButton.click();
    
    // Wait for the download to start
    const download = await downloadPromise;
    
    // Verify the download started and has expected filename format
    expect(download.suggestedFilename()).toMatch(/merchants.*\.csv$/i);
  });
});
