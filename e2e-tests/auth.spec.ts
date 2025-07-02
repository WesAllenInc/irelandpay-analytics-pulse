import { test, expect } from '@playwright/test';

// Test suite for authentication flows
test.describe('Authentication', () => {

  test.beforeEach(async ({ page }) => {
    // Go to the login page before each test
    await page.goto('/auth/login');
  });

  test('login page shows the correct elements', async ({ page }) => {
    // Check that the page has loaded with the correct title and form elements
    await expect(page.getByRole('heading', { name: 'IrelandPay Analytics' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('shows validation error on empty form submission', async ({ page }) => {
    // Try to submit the form without entering any data
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Check for validation messages (HTML5 validation will prevent submission)
    // The email input should have the :invalid pseudo-class
    await expect(page.getByLabel('Email')).toHaveAttribute('required', '');
    await expect(page.getByLabel('Password')).toHaveAttribute('required', '');
  });

  test('shows error toast on invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    await page.getByLabel('Email').fill('test@invalid.com');
    await page.getByLabel('Password').fill('wrongpassword');
    
    // Submit the form
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Check for error toast
    await expect(page.getByText('Login failed')).toBeVisible();
  });

  test('redirects to dashboard on successful login', async ({ page }) => {
    // This test requires a valid test user in the Supabase auth system
    // For E2E tests, we should use a dedicated test account
    
    // Enter valid credentials (these should be environment variables in a real setup)
    await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD || 'password123');
    
    // Submit the form
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Check that we're redirected to the dashboard
    // We'll need to add a waitForURL or similar
    await page.waitForURL('/dashboard');
    await expect(page.url()).toContain('/dashboard');
    
    // Verify that some dashboard element is visible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('shows loading state during login attempt', async ({ page }) => {
    // Fill in the form
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    
    // Start watching for the loading state before clicking
    const signInPromise = page.getByText('Signing in...').waitFor({ timeout: 2000 });
    
    // Click the button
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Verify the loading state appears
    await signInPromise;
  });
});
