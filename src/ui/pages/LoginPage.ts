/**
 * ============================================================================
 * 📁 LoginPage.ts — Page Object for SauceDemo Login Page
 * ============================================================================
 *
 * PURPOSE:
 * Encapsulates ALL interactions with the SauceDemo login page
 * (https://www.saucedemo.com/). This includes:
 *   - Finding the username/password fields
 *   - Typing credentials and clicking login
 *   - Verifying success or error states
 *
 * WHAT IS SAUCEDEMO?
 * It's a free demo e-commerce website made specifically for practicing
 * test automation. It has login, product browsing, cart, and checkout flows.
 *
 * LOCATOR STRATEGY:
 * We use multiple locator strategies for resilience:
 *   - Primary: CSS selectors (#user-name, #password)
 *   - Backup (auto-heal): Role-based and placeholder-based locators
 *
 * USAGE IN TESTS:
 *   const loginPage = new LoginPage(page);
 *   await loginPage.navigate();
 *   await loginPage.login('standard_user', 'secret_sauce');
 *   await loginPage.verifyLoginSuccess();
 * ============================================================================
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { UI_URLS } from '../../core/config/test-data.config';

export class LoginPage extends BasePage {
  // ═══════════════════════════════════════════════════════════════════
  // 📍 LOCATORS — Where each element lives on the page
  // ═══════════════════════════════════════════════════════════════════
  //
  // Each locator points to ONE specific element on the login page.
  // If the app changes an element's ID, you update it HERE — not in tests.
  //
  // We use Playwright's `locator()` method which auto-waits for elements.
  // This means you DON'T need to manually add "wait for element" code.
  // ═══════════════════════════════════════════════════════════════════

  /** The username text input field */
  readonly usernameInput: Locator;

  /** The password text input field */
  readonly passwordInput: Locator;

  /** The "Login" button that submits the form */
  readonly loginButton: Locator;

  /** The error message container (appears when login fails) */
  readonly errorMessage: Locator;

  /** The page title/logo text */
  readonly pageTitle: Locator;

  /**
   * Creates a new LoginPage instance.
   *
   * WHAT HAPPENS HERE:
   * 1. Calls the parent constructor (BasePage) to set up common features
   * 2. Defines locators for every element we'll interact with
   *
   * WHY DEFINE LOCATORS IN THE CONSTRUCTOR?
   * Because they're "lazy" — Playwright doesn't actually search for the
   * element until you USE the locator (e.g., call .click() or .fill()).
   * This means it's safe to define them before the page even loads.
   *
   * @param page - The Playwright Page object (provided by fixtures)
   */
  constructor(page: Page) {
    // Call parent with the page name for logging
    super(page, 'LoginPage');

    // ── Define all locators ────────────────────────────────────────
    // Strategy: Use the most STABLE selector available.
    // IDs (#user-name) are usually very stable.
    this.usernameInput = page.locator('#user-name');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('#login-button');
    this.errorMessage = page.locator('[data-test="error"]');
    this.pageTitle = page.locator('.login_logo');
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🎬 ACTIONS — Things you can DO on this page
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Navigates to the SauceDemo login page.
   *
   * EXAMPLE:
   *   await loginPage.navigate();
   *   // Browser is now showing https://www.saucedemo.com/
   */
  async navigate(): Promise<void> {
    this.log.step('Navigating to SauceDemo login page');
    await this.navigateTo(UI_URLS.saucedemo.login);
  }

  /**
   * Performs a complete login with the given credentials.
   *
   * This method:
   * 1. Fills in the username
   * 2. Fills in the password
   * 3. Clicks the Login button
   *
   * @param username - The username to enter (e.g., 'standard_user')
   * @param password - The password to enter (e.g., 'secret_sauce')
   *
   * EXAMPLE:
   *   await loginPage.login('standard_user', 'secret_sauce');
   */
  async login(username: string, password: string): Promise<void> {
    this.log.step(`Logging in as: ${username}`);

    // Fill the username field
    await this.fill(this.usernameInput, username, 'Username');

    // Fill the password field
    await this.fill(this.passwordInput, password, 'Password');

    // Click the Login button (with auto-heal context in case the ID changes)
    await this.click(this.loginButton, 'Login Button', {
      role: 'button',
      text: 'Login',
    });

    this.log.info('Login form submitted.');
  }

  // ═══════════════════════════════════════════════════════════════════
  // ✅ VERIFICATIONS — Checking that things worked correctly
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Verifies that login was successful by checking the URL.
   * After a successful login, the URL changes to include "inventory.html".
   *
   * THROWS: If the URL doesn't change to inventory within the timeout,
   * this will throw an assertion error (test fails).
   */
  async verifyLoginSuccess(): Promise<void> {
    this.log.step('Verifying successful login');
    await this.assertUrl(/inventory.html/);
    this.log.info('✅ Login successful — redirected to inventory page.');
  }

  /**
   * Verifies that a specific error message is displayed.
   * Used after attempting login with invalid credentials.
   *
   * @param expectedMessage - The exact error text to look for
   *
   * EXAMPLE:
   *   await loginPage.verifyErrorMessage('Epic sadface: Username is required');
   */
  async verifyErrorMessage(expectedMessage: string): Promise<void> {
    this.log.step(`Verifying error message: "${expectedMessage}"`);
    await this.assertTextContains(this.errorMessage, expectedMessage, 'Error Message');
    this.log.info('✅ Error message verified.');
  }

  /**
   * Verifies that the login page is displayed correctly.
   * Checks that the logo, input fields, and button are all visible.
   */
  async verifyPageLoaded(): Promise<void> {
    this.log.step('Verifying login page is fully loaded');
    await this.assertVisible(this.pageTitle, 'Swag Labs Logo');
    await this.assertVisible(this.usernameInput, 'Username Input');
    await this.assertVisible(this.passwordInput, 'Password Input');
    await this.assertVisible(this.loginButton, 'Login Button');
    this.log.info('✅ Login page fully loaded.');
  }
}
