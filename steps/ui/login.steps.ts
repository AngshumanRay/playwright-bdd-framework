/**
 * ============================================================================
 * 📁 login.steps.ts — Step Definitions for Login Feature
 * ============================================================================
 *
 * PURPOSE:
 * Connects the English sentences in `features/ui/login.feature` to actual
 * TypeScript code that automates the browser.
 *
 * HOW STEP DEFINITIONS WORK:
 * 1. The feature file says: Given "I am on the SauceDemo login page"
 * 2. Playwright-BDD looks for a step definition matching that text
 * 3. It finds the matching function HERE and runs it
 * 4. The function uses the LoginPage fixture to perform the action
 *
 * BEST PRACTICES:
 * - Steps should be THIN — they call Page Object methods, not raw Playwright
 * - Steps should be REUSABLE — write them generically so multiple features can use them
 * - Steps should not contain business logic — that goes in Page Objects
 * ============================================================================
 */

import { Given, When, Then } from './ui.fixtures';
import { expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════
// 📋 GIVEN Steps — Setting up the initial state
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Navigates the browser to the SauceDemo login page.
 *
 * MATCHES: "Given I am on the SauceDemo login page"
 *
 * The { loginPage } is a FIXTURE — Playwright creates it automatically
 * and injects it into this function. See ui.fixtures.ts for how it's defined.
 */
Given('I am on the SauceDemo login page', async ({ loginPage }) => {
  await loginPage.navigate();
});

/**
 * Logs in as a standard user and navigates to the inventory page.
 * Used as a Background step when tests need a pre-logged-in state.
 *
 * MATCHES: "Given I am logged in as a standard user"
 */
Given('I am logged in as a standard user', async ({ loginPage }) => {
  // Navigate to the login page
  await loginPage.navigate();
  // Login with standard credentials
  await loginPage.login('standard_user', 'secret_sauce');
  // Verify we're on the inventory page before continuing
  await loginPage.verifyLoginSuccess();
});

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 WHEN Steps — Performing user actions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Performs login with the default valid credentials.
 *
 * MATCHES: "When I login with valid credentials"
 */
When('I login with valid credentials', async ({ loginPage }) => {
  await loginPage.login('standard_user', 'secret_sauce');
});

/**
 * Performs login with specific credentials from the feature file.
 *
 * MATCHES: "When I login with "<username>" and "<password>""
 *
 * The {string} placeholders capture values from the feature file.
 * For example: When I login with "locked_out_user" and "secret_sauce"
 *   → username = "locked_out_user"
 *   → password = "secret_sauce"
 */
When(
  'I login with {string} and {string}',
  async ({ loginPage }, username: string, password: string) => {
    await loginPage.login(username, password);
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// ✅ THEN Steps — Verifying the expected outcome
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifies that login was successful (URL changed to inventory page).
 *
 * MATCHES: "Then I should be redirected to the inventory page"
 */
Then('I should be redirected to the inventory page', async ({ loginPage }) => {
  await loginPage.verifyLoginSuccess();
});

/**
 * Verifies that a specific error message is displayed on the login page.
 *
 * MATCHES: "Then I should see the error message "<message>""
 *
 * The {string} captures the expected error text from the feature file.
 */
Then(
  'I should see the error message {string}',
  async ({ loginPage }, message: string) => {
    await loginPage.verifyErrorMessage(message);
  },
);
