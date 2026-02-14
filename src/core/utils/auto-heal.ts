/**
 * ============================================================================
 * 📁 auto-heal.ts — Self-Healing Locator Strategy
 * ============================================================================
 *
 * PURPOSE:
 * Web applications change frequently — buttons move, IDs change, class names
 * get updated. When this happens, tests break even though the app still works
 * fine. This file implements "auto-healing" — when a locator fails, the
 * framework automatically tries alternative strategies to find the element.
 *
 * HOW IT WORKS:
 * 1. Your test tries to find an element using its primary locator (e.g., #login-btn)
 * 2. If that fails, the auto-healer tries alternative strategies:
 *    - By role (button, link, textbox, etc.)
 *    - By text content
 *    - By placeholder text
 *    - By test ID attributes
 *    - By CSS selector variations
 * 3. If an alternative works, it logs a WARNING so you know to update the test
 * 4. The test continues instead of crashing
 *
 * FOR BEGINNERS:
 * Imagine you wrote a test that clicks a button with id="submit".
 * A developer changes it to id="submit-btn". Without auto-heal, your test
 * crashes. WITH auto-heal, the framework says "I couldn't find #submit,
 * but I found a button with text 'Submit' — I'll use that instead."
 * It warns you so you can update the locator, but the test keeps running.
 * ============================================================================
 */

import { Page, Locator } from '@playwright/test';
import { Logger } from './logger';

/** Logger instance for this module */
const log = new Logger('AutoHeal');

/**
 * Configuration for the auto-heal system.
 * Controls how aggressively it searches for alternatives.
 */
export interface AutoHealConfig {
  /** Whether auto-healing is enabled (default: true) */
  enabled: boolean;
  /** Maximum time (ms) to spend trying alternative locators (default: 5000) */
  timeout: number;
  /** Whether to log warnings when auto-heal activates (default: true) */
  logWarnings: boolean;
}

/** Default auto-heal settings — sensible for most projects */
const DEFAULT_CONFIG: AutoHealConfig = {
  enabled: true,
  timeout: 5000,
  logWarnings: true,
};

/**
 * Describes a single "strategy" for finding an element.
 * The auto-healer tries these one by one until one works.
 */
interface HealingStrategy {
  /** A human-readable name for this strategy (for logging) */
  name: string;
  /** A function that returns a Playwright Locator using this strategy */
  locate: (page: Page, context: ElementContext) => Locator;
}

/**
 * Context about the element we're trying to find.
 * This information helps the auto-healer make smarter guesses.
 */
interface ElementContext {
  /** The original selector that failed (e.g., '#login-button') */
  originalSelector: string;
  /** The expected role of the element (e.g., 'button', 'link') */
  role?: string;
  /** The expected text content of the element */
  text?: string;
  /** The expected placeholder text (for inputs) */
  placeholder?: string;
  /** A test ID attribute value */
  testId?: string;
}

/**
 * The list of healing strategies, tried in order of reliability.
 *
 * WHY THIS ORDER:
 * 1. Role-based: Most stable — roles rarely change
 * 2. Text-based: Usually stable — button text doesn't change often
 * 3. Placeholder: Good for inputs
 * 4. TestId: If the team uses data-testid attributes
 * 5. Partial text: Last resort — less precise
 */
const HEALING_STRATEGIES: HealingStrategy[] = [
  {
    name: 'By Role',
    locate: (page, ctx) => {
      if (!ctx.role) return page.locator('__nonexistent__');
      const options: any = {};
      if (ctx.text) options.name = ctx.text;
      return page.getByRole(ctx.role as any, options);
    },
  },
  {
    name: 'By Text (exact)',
    locate: (page, ctx) => {
      if (!ctx.text) return page.locator('__nonexistent__');
      return page.getByText(ctx.text, { exact: true });
    },
  },
  {
    name: 'By Placeholder',
    locate: (page, ctx) => {
      if (!ctx.placeholder) return page.locator('__nonexistent__');
      return page.getByPlaceholder(ctx.placeholder);
    },
  },
  {
    name: 'By Test ID',
    locate: (page, ctx) => {
      if (!ctx.testId) return page.locator('__nonexistent__');
      return page.getByTestId(ctx.testId);
    },
  },
  {
    name: 'By Text (partial)',
    locate: (page, ctx) => {
      if (!ctx.text) return page.locator('__nonexistent__');
      return page.getByText(ctx.text, { exact: false });
    },
  },
];

/**
 * Attempts to find an element using the primary locator.
 * If it fails, tries alternative healing strategies.
 *
 * @param page - The Playwright Page object
 * @param primaryLocator - The main locator to try first
 * @param context - Additional context to help find the element
 * @param config - Auto-heal configuration (optional)
 * @returns A Locator that points to the found element
 *
 * USAGE:
 *   // In a Page Object:
 *   const button = await autoHealLocator(
 *     this.page,
 *     this.page.locator('#old-submit-button'),
 *     { role: 'button', text: 'Submit', originalSelector: '#old-submit-button' }
 *   );
 *   await button.click();
 */
export async function autoHealLocator(
  page: Page,
  primaryLocator: Locator,
  context: ElementContext,
  config: AutoHealConfig = DEFAULT_CONFIG,
): Promise<Locator> {
  // ── Step 1: Try the primary locator first ──────────────────────────
  try {
    // Wait a short time for the element to appear
    await primaryLocator.waitFor({ state: 'visible', timeout: config.timeout });
    // If it works, great — return it immediately
    return primaryLocator;
  } catch {
    // Primary locator failed — if auto-heal is disabled, throw the error
    if (!config.enabled) {
      throw new Error(
        `Element not found: "${context.originalSelector}". Auto-heal is disabled.`,
      );
    }

    // Auto-heal is enabled — let's try alternatives
    if (config.logWarnings) {
      log.warn(
        `Primary locator FAILED: "${context.originalSelector}". Attempting auto-heal...`,
      );
    }
  }

  // ── Step 2: Try each healing strategy ──────────────────────────────
  for (const strategy of HEALING_STRATEGIES) {
    try {
      const alternativeLocator = strategy.locate(page, context);
      // Check if this alternative can find the element (short timeout)
      await alternativeLocator.first().waitFor({ state: 'visible', timeout: 2000 });

      // SUCCESS! We found the element with an alternative strategy
      if (config.logWarnings) {
        log.warn(
          `✅ Auto-healed! Strategy "${strategy.name}" found the element. ` +
          `Please update locator: "${context.originalSelector}"`,
        );
      }
      return alternativeLocator.first();
    } catch {
      // This strategy didn't work — try the next one
      log.debug(`Strategy "${strategy.name}" did not find element.`);
    }
  }

  // ── Step 3: All strategies failed ──────────────────────────────────
  log.error(
    `❌ Auto-heal FAILED for "${context.originalSelector}". ` +
    `No alternative strategies could find the element.`,
  );
  throw new Error(
    `Auto-heal exhausted all strategies for: "${context.originalSelector}". ` +
    `Element not found on the page.`,
  );
}

/**
 * A decorator-style helper that wraps a locator with auto-heal capability.
 * Use this when defining locators in Page Objects for extra resilience.
 *
 * @param page - The Playwright Page object
 * @param selector - The CSS/XPath selector string
 * @param healContext - Context to help auto-heal if the selector fails
 * @returns A function that resolves to a working Locator
 *
 * USAGE IN PAGE OBJECTS:
 *   class LoginPage extends BasePage {
 *     getLoginButton = () => resilientLocator(this.page, '#login-button', {
 *       role: 'button',
 *       text: 'Login',
 *     });
 *
 *     async clickLogin() {
 *       const btn = await this.getLoginButton();
 *       await btn.click();
 *     }
 *   }
 */
export function resilientLocator(
  page: Page,
  selector: string,
  healContext: Omit<ElementContext, 'originalSelector'>,
): () => Promise<Locator> {
  return () =>
    autoHealLocator(page, page.locator(selector), {
      ...healContext,
      originalSelector: selector,
    });
}
