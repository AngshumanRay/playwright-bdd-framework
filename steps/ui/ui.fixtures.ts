/**
 * ============================================================================
 * 📁 ui.fixtures.ts — UI Test Fixtures (Setup Crew for Browser Tests)
 * ============================================================================
 *
 * PURPOSE:
 * Fixtures are the "setup crew" for your tests. Before each test runs,
 * fixtures prepare everything the test needs:
 *   - Creating page objects (LoginPage, InventoryPage, etc.)
 *   - Setting up the browser context
 *   - Configuring any test-specific settings
 *
 * After the test finishes, fixtures clean up (close pages, save data, etc.)
 *
 * HOW PLAYWRIGHT FIXTURES WORK:
 * 1. You DEFINE a fixture (e.g., "loginPage") and what it provides
 * 2. Your step definitions DECLARE which fixtures they need
 * 3. Playwright automatically creates and injects the fixtures
 * 4. After the test, Playwright automatically cleans them up
 *
 * FOR BEGINNERS:
 * Imagine you're setting up a science experiment:
 *   - Fixtures = The lab equipment (beakers, thermometers)
 *   - Test = The experiment itself
 *   - You DECLARE what equipment you need, and someone brings it to you
 *   - After the experiment, someone puts it all away
 *
 * You don't have to worry about creating or cleaning up — just use them!
 * ============================================================================
 */

import { test as base, createBdd } from 'playwright-bdd';
import { LoginPage } from '../../src/ui/pages/LoginPage';
import { InventoryPage } from '../../src/ui/pages/InventoryPage';
import { PlaywrightDocsPage } from '../../src/ui/pages/PlaywrightDocsPage';

/**
 * Define the TYPES of our custom fixtures.
 * This tells TypeScript what fixtures are available and what type they are.
 *
 * Think of this as a "menu" of available fixtures:
 *   loginPage:      → A LoginPage object for interacting with the login screen
 *   inventoryPage:  → An InventoryPage object for the products page
 *   playwrightPage: → A PlaywrightDocsPage for the Playwright docs site
 */
type UIFixtures = {
  /** Page Object for the SauceDemo login page */
  loginPage: LoginPage;
  /** Page Object for the SauceDemo inventory/products page */
  inventoryPage: InventoryPage;
  /** Page Object for the Playwright documentation site */
  playwrightPage: PlaywrightDocsPage;
};

/**
 * Extend Playwright's base test with our custom UI fixtures.
 *
 * HOW THIS WORKS:
 * - `base.extend<UIFixtures>({...})` tells Playwright:
 *   "Hey, I want to add these new fixtures on top of your built-in ones."
 * - Each fixture is a function that:
 *   1. Receives the `page` (Playwright's browser page) as input
 *   2. Creates the fixture value (e.g., new LoginPage(page))
 *   3. Calls `use(value)` to hand it to the test
 *   4. Cleanup code (if any) runs AFTER `use()` completes
 *
 * EXAMPLE OF FIXTURE LIFECYCLE:
 *   1. Test needs `loginPage` → Playwright calls the fixture function
 *   2. `new LoginPage(page)` creates the page object
 *   3. `await use(loginPage)` gives it to the test
 *   4. Test runs using `loginPage.login(...)`, `loginPage.verify(...)`
 *   5. Test finishes → control returns here (after `use()`)
 *   6. Any cleanup code after `use()` runs
 */
export const test = base.extend<UIFixtures>({
  /**
   * LoginPage fixture.
   * Creates a fresh LoginPage for each test that needs it.
   */
  loginPage: async ({ page }, use) => {
    // Create the LoginPage and hand it to the test
    await use(new LoginPage(page));
    // After the test: nothing to clean up for page objects
  },

  /**
   * InventoryPage fixture.
   * Creates a fresh InventoryPage for each test that needs it.
   */
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },

  /**
   * PlaywrightDocsPage fixture.
   * Creates a fresh PlaywrightDocsPage for each test that needs it.
   */
  playwrightPage: async ({ page }, use) => {
    await use(new PlaywrightDocsPage(page));
  },
});

/**
 * Export the BDD step definition functions.
 *
 * WHAT ARE THESE?
 * Given, When, Then are functions you use to DEFINE step definitions.
 * They connect the English text in your .feature files to actual code.
 *
 * createBdd(test) links these functions to our custom test fixtures,
 * so your step definitions can access loginPage, inventoryPage, etc.
 *
 * USAGE IN STEP FILES:
 *   import { Given, When, Then } from './ui.fixtures';
 *
 *   Given('I am on the login page', async ({ loginPage }) => {
 *     await loginPage.navigate();
 *   });
 */
export const { Given, When, Then } = createBdd(test);
