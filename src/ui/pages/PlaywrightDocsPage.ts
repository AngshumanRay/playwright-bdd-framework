/**
 * ============================================================================
 * 📁 PlaywrightDocsPage.ts — Page Object for Playwright Documentation Site
 * ============================================================================
 *
 * PURPOSE:
 * Encapsulates interactions with the Playwright documentation website
 * (https://playwright.dev/). This demonstrates how the framework can
 * automate ANY website — not just SauceDemo.
 *
 * DEMONSTRATES:
 *   - Working with search functionality
 *   - Interacting with dynamic content (search results)
 *   - Using role-based locators (more resilient than CSS selectors)
 *
 * FOR BEGINNERS:
 * This is a SECOND example page object. By studying LoginPage and this page,
 * you'll see the pattern: every page follows the same structure:
 *   1. Define locators in the constructor
 *   2. Create action methods (click, fill, navigate)
 *   3. Create verification methods (assertText, assertUrl)
 * ============================================================================
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { UI_URLS } from '../../core/config/test-data.config';

export class PlaywrightDocsPage extends BasePage {
  // ═══════════════════════════════════════════════════════════════════
  // 📍 LOCATORS
  // ═══════════════════════════════════════════════════════════════════

  /** The "Get started" link on the homepage */
  readonly getStartedLink: Locator;

  /** The search button/icon (opens the search dialog) */
  readonly searchButton: Locator;

  /** The search input field (appears after clicking search button) */
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page, 'PlaywrightDocsPage');

    // ── Role-based locators ──────────────────────────────────────────
    // These use `getByRole()` which is MORE RESILIENT than CSS selectors.
    // Even if the CSS classes change, the role and name usually stay the same.
    this.getStartedLink = page.getByRole('link', { name: 'Get started' });
    this.searchButton = page.locator('.DocSearch-Button');
    this.searchInput = page.locator('#docsearch-input');
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🎬 ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Navigates to the Playwright documentation homepage.
   */
  async navigate(): Promise<void> {
    this.log.step('Navigating to Playwright docs homepage');
    await this.navigateTo(UI_URLS.playwright.home);
  }

  /**
   * Clicks the "Get Started" link on the homepage.
   * This navigates to the installation/intro page.
   */
  async clickGetStarted(): Promise<void> {
    this.log.step('Clicking "Get Started" link');
    await this.click(this.getStartedLink, 'Get Started link', {
      role: 'link',
      text: 'Get started',
    });
  }

  /**
   * Opens the search dialog and searches for a query.
   *
   * @param query - The search term (e.g., "Locators")
   *
   * EXAMPLE:
   *   await docsPage.searchFor('Locators');
   */
  async searchFor(query: string): Promise<void> {
    this.log.step(`Searching for: "${query}"`);

    // Wait for the DocSearch button to be ready (JS may take time to init)
    await this.searchButton.waitFor({ state: 'visible', timeout: 15000 });

    // Click the search button to open the dialog
    await this.searchButton.click();

    // Wait briefly then check if dialog opened; if not, try keyboard shortcut
    try {
      await this.searchInput.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      // Fallback: use keyboard shortcut (Ctrl+K on Linux/Windows, Meta+K on Mac)
      this.log.warn('Search dialog did not open via click, trying keyboard shortcut');
      await this.page.keyboard.press('Meta+k');
      await this.searchInput.waitFor({ state: 'visible', timeout: 5000 });
    }

    // Type the search query into the search input
    await this.fill(this.searchInput, query, 'Search Input');

    // Wait for search results to appear
    await this.page.waitForSelector('.DocSearch-Hit', {
      timeout: ENV_CONFIG_TIMEOUT,
    });

    this.log.info(`Search results loaded for: "${query}"`);
  }

  /**
   * Clicks the first search result that matches the given text.
   *
   * @param text - The text to look for in search results
   */
  async clickSearchResult(text: string): Promise<void> {
    this.log.step(`Clicking search result: "${text}"`);
    await this.page
      .locator('.DocSearch-Hit')
      .filter({ hasText: text })
      .first()
      .click();
    this.log.info(`Clicked search result for: "${text}"`);
  }

  /**
   * Sets up network interception to mock search API responses.
   * This is useful for testing without depending on the external search service.
   *
   * @param mockResults - Array of mock result objects to return
   */
  async interceptSearchApi(
    mockResults: Array<{ title: string; url: string }> = [],
  ): Promise<void> {
    this.log.step('Setting up search API interception');

    await this.page.route(/algolia|docsearch/, async (route) => {
      // DocSearch v3 expects the Algolia multi-index response format
      const json = {
        results: [
          {
            hits: mockResults.map((result, index) => ({
              objectID: String(index + 1),
              url: result.url,
              type: 'lvl1',
              hierarchy: {
                lvl0: 'Documentation',
                lvl1: result.title,
                lvl2: null,
                lvl3: null,
                lvl4: null,
                lvl5: null,
                lvl6: null,
              },
              _highlightResult: {
                hierarchy: {
                  lvl0: { value: 'Documentation', matchLevel: 'none', matchedWords: [] },
                  lvl1: { value: result.title, matchLevel: 'full', matchedWords: ['mocked'] },
                },
              },
            })),
            nbHits: mockResults.length,
            page: 0,
            nbPages: 1,
            hitsPerPage: 20,
            query: '',
            params: '',
            index: 'playwright',
            processingTimeMS: 1,
          },
        ],
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json),
      });
    });

    this.log.info('Search API interception configured.');
  }

  // ═══════════════════════════════════════════════════════════════════
  // ✅ VERIFICATIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Verifies that a specific text appears in the search results.
   *
   * @param expectedText - The text to look for in search results
   */
  async verifySearchResultVisible(expectedText: string): Promise<void> {
    this.log.step(`Verifying search result visible: "${expectedText}"`);
    const result = this.page
      .locator('.DocSearch-Hit')
      .filter({ hasText: expectedText })
      .first();
    await this.assertVisible(result, `Search result: ${expectedText}`);
  }
}

// ── Private constant for timeout (avoids importing full config in locator context) ──
const ENV_CONFIG_TIMEOUT = 10000;
