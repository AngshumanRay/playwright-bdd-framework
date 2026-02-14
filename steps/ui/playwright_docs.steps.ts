/**
 * ============================================================================
 * 📁 playwright_docs.steps.ts — Steps for Playwright Docs Feature
 * ============================================================================
 *
 * PURPOSE:
 * Connects feature steps for the Playwright documentation site.
 * Demonstrates how to automate search, navigation, and network interception.
 * ============================================================================
 */

import { Given, When, Then } from './ui.fixtures';
import { expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════
// 📋 GIVEN Steps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Navigates to the Playwright documentation homepage.
 *
 * MATCHES: "Given I am on the Playwright homepage"
 */
Given('I am on the Playwright homepage', async ({ playwrightPage }) => {
  await playwrightPage.navigate();
});

/**
 * Sets up network interception to mock the search API.
 * This replaces real search results with controlled fake data.
 *
 * MATCHES: "Given I intercept the search API to return mocked results"
 */
Given(
  'I intercept the search API to return mocked results',
  async ({ playwrightPage, $testInfo }) => {
    // WebKit doesn't reliably intercept cross-origin CORS fetch requests
    // This is a known Playwright limitation — skip on WebKit
    $testInfo.skip(
      $testInfo.project.name === 'webkit',
      'Route interception for cross-origin requests is not reliable on WebKit',
    );
    await playwrightPage.interceptSearchApi([
      {
        title: 'Mocked Result',
        url: 'https://playwright.dev/docs/intro',
      },
    ]);
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 WHEN Steps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clicks the "Get Started" link on the Playwright homepage.
 *
 * MATCHES: "When I click on the Get Started link"
 */
When('I click on the Get Started link', async ({ playwrightPage }) => {
  await playwrightPage.clickGetStarted();
});

/**
 * Searches for a term in the Playwright documentation.
 *
 * MATCHES: 'When I search for "Locators"'
 */
When('I search for {string}', async ({ playwrightPage }, query: string) => {
  await playwrightPage.searchFor(query);
});

/**
 * Clicks the first search result matching the given text.
 *
 * MATCHES: 'When I click the first search result for "Locators"'
 */
When(
  'I click the first search result for {string}',
  async ({ playwrightPage }, text: string) => {
    await playwrightPage.clickSearchResult(text);
  },
);

/**
 * Sends a direct HTTP request (not through the browser).
 * Used for verifying that a URL responds correctly.
 *
 * MATCHES: 'When I send a direct request to "https://playwright.dev/"'
 */
When(
  'I send a direct request to {string}',
  async ({ request }, url: string) => {
    // Store the response on the context for the Then step to access
    const response = await request.get(url);
    // Save it as a custom property
    (request as any).__lastResponse = response;
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// ✅ THEN Steps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifies that the page URL contains a specific string.
 *
 * MATCHES: 'Then the URL should contain "intro"'
 */
Then('the URL should contain {string}', async ({ page }, text: string) => {
  await expect(page).toHaveURL(new RegExp(text));
});

/**
 * Verifies that a heading on the page contains specific text.
 *
 * MATCHES: 'Then I should see "Installation" in the page heading'
 */
Then(
  'I should see {string} in the page heading',
  async ({ page }, text: string) => {
    await expect(page.locator('h1')).toContainText(text);
  },
);

/**
 * Verifies that the browser tab title contains specific text.
 *
 * MATCHES: 'Then the page title should contain "Locators"'
 */
Then(
  'the page title should contain {string}',
  async ({ page }, text: string) => {
    await expect(page).toHaveTitle(new RegExp(text));
  },
);

/**
 * Verifies that a search result with the given text is visible.
 *
 * MATCHES: 'Then I should see "Mocked Result" in the search results'
 */
Then(
  'I should see {string} in the search results',
  async ({ page }, text: string) => {
    await expect(
      page.locator('.DocSearch-Hit').filter({ hasText: text }).first(),
    ).toBeVisible();
  },
);

/**
 * Verifies the status code of a direct HTTP response.
 *
 * MATCHES: 'Then the direct response status should be 200'
 */
Then(
  'the direct response status should be {int}',
  async ({ request }, status: number) => {
    const response = (request as any).__lastResponse;
    expect(response.status()).toBe(status);
  },
);
