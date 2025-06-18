/**
 * Test Authentication Flow for Ireland Pay Analytics
 * 
 * This script helps test the authentication flow after deployment.
 * It uses Playwright to simulate user sign-in and sign-out actions.
 */

const { chromium } = require('playwright');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for input
const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function testAuthFlow() {
  console.log('🔒 Ireland Pay Analytics Authentication Flow Test');
  console.log('------------------------------------------------');
  
  // Get deployment URL
  const deploymentUrl = await prompt('Enter your deployment URL (e.g., https://irelandpay-analytics-pulse.vercel.app): ');
  const testEmail = await prompt('Enter test email (for sign-in test): ');
  const testPassword = await prompt('Enter test password: ');
  
  console.log('\n🚀 Starting authentication flow test...');
  
  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test 1: Load auth page
    console.log('\n📋 Test 1: Loading auth page');
    await page.goto(`${deploymentUrl}/auth`);
    await page.waitForLoadState('networkidle');
    console.log('✅ Auth page loaded successfully');
    
    // Test 2: Sign in
    console.log('\n📋 Test 2: Testing sign-in');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Wait for redirect after successful login
    try {
      await page.waitForURL(/dashboard|leaderboard/, { timeout: 10000 });
      console.log('✅ Sign-in successful! Redirected to dashboard/leaderboard');
    } catch (error) {
      console.error('❌ Sign-in failed or redirect did not happen');
      console.log('Current URL:', page.url());
      throw new Error('Sign-in test failed');
    }
    
    // Test 3: Check if user data is loaded
    console.log('\n📋 Test 3: Checking if user data is loaded');
    // Wait for user data to load (look for elements that would only appear when authenticated)
    try {
      // Wait for navigation menu or user profile element
      await page.waitForSelector('nav', { timeout: 5000 });
      console.log('✅ User data loaded successfully');
    } catch (error) {
      console.error('❌ User data not loaded properly');
      throw new Error('User data test failed');
    }
    
    // Test 4: Sign out
    console.log('\n📋 Test 4: Testing sign-out');
    // Find and click sign out button (adjust selector based on your UI)
    try {
      // First try to find it in a dropdown menu if it exists
      await page.click('button[aria-label="Open user menu"]', { timeout: 3000 })
        .catch(() => console.log('No user menu button found, trying direct sign out button'));
      
      // Look for sign out button
      await page.click('button:has-text("Sign out")', { timeout: 3000 })
        .catch(() => page.click('a:has-text("Sign out")'));
      
      // Wait for redirect to auth page
      await page.waitForURL(/auth/, { timeout: 5000 });
      console.log('✅ Sign-out successful! Redirected to auth page');
    } catch (error) {
      console.error('❌ Sign-out failed or redirect did not happen');
      console.log('Current URL:', page.url());
      throw new Error('Sign-out test failed');
    }
    
    console.log('\n🎉 All authentication tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
    rl.close();
  }
}

// Run the test
testAuthFlow();
