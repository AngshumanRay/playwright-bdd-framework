/**
 * ============================================================================
 * 📁 BasePage.ts — The Foundation of ALL Page Objects
 * ============================================================================
 *
 * PURPOSE:
 * This is the PARENT class for every page object in the framework. It contains
 * common actions that EVERY web page needs: navigating, waiting, clicking,
 * typing, taking screenshots, etc.
 *
 * DESIGN PATTERN: Page Object Model (POM)
 * Instead of writing Playwright commands directly in your tests, you create
 * "Page" classes that know how to interact with each page of your app.
 * This means:
 *   ✅ If the app changes, you update ONE page class (not 50 tests)
 *   ✅ Tests read like English: loginPage.login('user', 'pass')
 *   ✅ Code is reusable across many tests
 *
 * INHERITANCE:
 *   BasePage (this file)
 *     ├── LoginPage      — knows about the login page
 *     ├── InventoryPage   — knows about the products page
 *     └── YourNewPage     — add your own!
 *
 * FOR BEGINNERS:
 * Think of BasePage as a "Swiss Army Knife" that every page gets for free.
 * When you create LoginPage, it automatically inherits ALL BasePage methods.
 * You don't need to write navigation or screenshot logic in every page.
 * ============================================================================
 */

import { Page, Locator, expect, BrowserContext } from '@playwright/test';
import { Logger } from '../../core/utils/logger';
import { autoHealLocator, ElementContext } from '../../core/utils/auto-heal';
import {
  collectPerformanceMetrics,
  runAccessibilityCheck,
  PerformanceMetrics,
  AccessibilityResult,
} from '../../core/utils/performance-helper';
import { MetricsCollector } from '../../core/utils/metrics-collector';
import { ENV_CONFIG } from '../../core/config/env.config';

/**
 * BasePage — The parent class for ALL page objects.
 *
 * Every page in your application should extend this class.
 * It provides common utilities so you don't repeat yourself.
 *
 * EXAMPLE:
 *   class MyPage extends BasePage {
 *     constructor(page: Page) {
 *       super(page, 'MyPage'); // Give it a name for logging
 *     }
 *
 *     // Your page-specific methods go here...
 *   }
 */
export class BasePage {
  /** The Playwright Page object — your window into the browser */
  readonly page: Page;

  /** Logger instance — automatically labeled with the page name */
  protected readonly log: Logger;

  /** The human-readable name of this page (used in logs and reports) */
  protected readonly pageName: string;

  /**
   * Creates a new BasePage.
   *
   * @param page - The Playwright Page object (provided by the test framework)
   * @param pageName - A descriptive name for logging (e.g., 'LoginPage')
   */
  constructor(page: Page, pageName: string = 'BasePage') {
    this.page = page;
    this.pageName = pageName;
    this.log = new Logger(pageName);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🧭 NAVIGATION — Getting to pages
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Navigates to a URL.
   *
   * @param url - The full URL to navigate to (e.g., 'https://example.com')
   *
   * EXAMPLE:
   *   await this.navigateTo('https://www.saucedemo.com/');
   */
  async navigateTo(url: string): Promise<void> {
    this.log.info(`Navigating to: ${url}`);
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: ENV_CONFIG.NAVIGATION_TIMEOUT,
    });
    this.log.info(`Navigation complete.`);
  }

  /**
   * Waits for the page to be fully loaded (all resources downloaded).
   * Useful after a navigation or form submission.
   */
  async waitForPageLoad(): Promise<void> {
    this.log.info('Waiting for page to fully load...');
    await this.page.waitForLoadState('load');
    this.log.info('Page fully loaded.');
  }

  /**
   * Gets the current page title.
   *
   * @returns The text in the browser's title bar (e.g., "Swag Labs")
   */
  async getTitle(): Promise<string> {
    const title = await this.page.title();
    this.log.info(`Page title: "${title}"`);
    return title;
  }

  /**
   * Gets the current page URL.
   *
   * @returns The full URL currently in the browser's address bar
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🖱️ INTERACTIONS — Clicking, typing, selecting
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Clicks on an element, with auto-heal support.
   *
   * @param locator - The Playwright Locator for the element to click
   * @param description - A human-readable description (for logging)
   * @param healContext - Optional context for auto-heal if the locator fails
   */
  async click(
    locator: Locator,
    description: string = 'element',
    healContext?: Omit<ElementContext, 'originalSelector'>,
  ): Promise<void> {
    this.log.info(`Clicking: ${description}`);
    try {
      await locator.click({ timeout: ENV_CONFIG.DEFAULT_TIMEOUT });
    } catch (error) {
      // If click failed and we have heal context, try auto-heal
      if (healContext) {
        this.log.warn(`Click failed on "${description}", attempting auto-heal...`);
        const healed = await autoHealLocator(this.page, locator, {
          ...healContext,
          originalSelector: description,
        });
        await healed.click();
      } else {
        throw error;
      }
    }
  }

  /**
   * Types text into an input field, clearing it first.
   *
   * @param locator - The Locator for the input field
   * @param text - The text to type
   * @param description - A human-readable description (for logging)
   */
  async fill(locator: Locator, text: string, description: string = 'input'): Promise<void> {
    this.log.info(`Filling "${description}" with: "${text}"`);
    await locator.fill(text, { timeout: ENV_CONFIG.DEFAULT_TIMEOUT });
  }

  /**
   * Selects an option from a dropdown by its visible text.
   *
   * @param locator - The Locator for the <select> element
   * @param option - The visible text of the option to select
   * @param description - A human-readable description (for logging)
   */
  async selectOption(
    locator: Locator,
    option: string,
    description: string = 'dropdown',
  ): Promise<void> {
    this.log.info(`Selecting "${option}" from ${description}`);
    await locator.selectOption({ label: option });
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⏳ WAITING — Pausing until conditions are met
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Waits until an element becomes visible on the page.
   *
   * @param locator - The element to wait for
   * @param timeout - Maximum time to wait (ms). Defaults to config value.
   */
  async waitForVisible(
    locator: Locator,
    timeout: number = ENV_CONFIG.DEFAULT_TIMEOUT,
  ): Promise<void> {
    this.log.info('Waiting for element to become visible...');
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Waits until an element disappears from the page.
   *
   * @param locator - The element to wait for disappearance
   * @param timeout - Maximum time to wait (ms)
   */
  async waitForHidden(
    locator: Locator,
    timeout: number = ENV_CONFIG.DEFAULT_TIMEOUT,
  ): Promise<void> {
    this.log.info('Waiting for element to disappear...');
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Waits for the URL to contain a specific string.
   * Useful after clicking a link or submitting a form.
   *
   * @param urlPart - The substring to look for in the URL
   */
  async waitForUrlContains(urlPart: string): Promise<void> {
    this.log.info(`Waiting for URL to contain: "${urlPart}"`);
    await this.page.waitForURL(`**/*${urlPart}*`, {
      timeout: ENV_CONFIG.NAVIGATION_TIMEOUT,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // ✅ ASSERTIONS — Verifying things are correct
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Asserts that an element contains specific text.
   *
   * @param locator - The element to check
   * @param expectedText - The text it should contain
   * @param description - Description for logging
   */
  async assertTextContains(
    locator: Locator,
    expectedText: string,
    description: string = 'element',
  ): Promise<void> {
    this.log.info(`Asserting "${description}" contains text: "${expectedText}"`);
    await expect(locator).toContainText(expectedText);
    this.log.info(`✅ Assertion passed.`);
  }

  /**
   * Asserts that the page URL matches a pattern.
   *
   * @param urlPattern - A string or regex to match against the URL
   */
  async assertUrl(urlPattern: string | RegExp): Promise<void> {
    this.log.info(`Asserting URL matches: ${urlPattern}`);
    await expect(this.page).toHaveURL(urlPattern);
    this.log.info(`✅ URL assertion passed.`);
  }

  /**
   * Asserts that an element is visible on the page.
   */
  async assertVisible(locator: Locator, description: string = 'element'): Promise<void> {
    this.log.info(`Asserting "${description}" is visible`);
    await expect(locator).toBeVisible();
    this.log.info(`✅ "${description}" is visible.`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 📸 SCREENSHOTS & DEBUGGING — Capturing evidence
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Takes a screenshot of the current page.
   * Useful for debugging or saving evidence of test state.
   *
   * @param name - A name for the screenshot file (without extension)
   * @returns The path to the saved screenshot
   */
  async takeScreenshot(name: string): Promise<string> {
    const screenshotPath = `${ENV_CONFIG.SCREENSHOT_DIR}/${name}-${Date.now()}.png`;
    this.log.info(`Taking screenshot: ${screenshotPath}`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 📊 METRICS — Performance & Accessibility
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Collects performance metrics from the current page and adds them
   * to the global metrics collector.
   *
   * @returns The collected PerformanceMetrics
   */
  async collectPerformance(): Promise<PerformanceMetrics> {
    const metrics = await collectPerformanceMetrics(this.page);
    MetricsCollector.getInstance().addPerformanceMetrics(metrics);
    return metrics;
  }

  /**
   * Runs an accessibility check on the current page and adds results
   * to the global metrics collector.
   *
   * @returns The AccessibilityResult with any issues found
   */
  async checkAccessibility(): Promise<AccessibilityResult> {
    const result = await runAccessibilityCheck(this.page);
    MetricsCollector.getInstance().addAccessibilityResult(result);
    return result;
  }
}
