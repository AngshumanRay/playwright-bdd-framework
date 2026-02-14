// ============================================================================
// playwright.config.ts - The Brain of the Framework
// ============================================================================
//
// PURPOSE:
// This is the MASTER configuration file. It tells Playwright:
//   - WHERE to find test files (features + steps)
//   - HOW to run them (browsers, timeouts, retries)
//   - WHAT to report (HTML, Allure, Monocart, Custom Dashboard)
//   - WHICH projects to run (UI tests vs API tests vs specific browsers)
//
// KEY ARCHITECTURE DECISION:
// We use defineBddProject() to create SEPARATE projects for:
//   - UI tests (chromium, firefox, webkit) - use browser, page objects
//   - API tests - no browser needed, just HTTP requests
//
// This separation means:
//   API tests run MUCH faster (no browser startup)
//   UI tests run across multiple browsers for cross-browser coverage
//   You can run just API or just UI tests using tags or project names
//
// FOR BEGINNERS:
// Think of "projects" as different "modes" for running tests:
//   npm test                            - runs ALL tests (UI + API)
//   npx playwright test --project=api   - runs ONLY API tests
//   npx playwright test --project=chromium - runs ONLY Chrome UI tests
// ============================================================================

import { defineConfig, devices } from '@playwright/test';
import { defineBddProject } from 'playwright-bdd';

export default defineConfig({
  // ─── Global Settings ────────────────────────────────────────────────
  // These apply to ALL projects unless overridden at the project level.

  /** Maximum time a single test can run before timing out (ms) */
  timeout: 60_000,

  /** Maximum time expect() assertions will wait before failing (ms) */
  expect: {
    timeout: 10_000,
  },

  /**
   * Retry failed tests automatically.
   * If a test fails, Playwright will re-run it this many times.
   * Helps with "flaky" tests (tests that sometimes pass, sometimes fail).
   * Tests that pass on retry are marked as "flaky" in reports.
   */
  retries: 1,

  /**
   * Run tests in parallel using this many workers.
   * More workers = faster execution, but uses more CPU/memory.
   * Set to 1 for debugging (tests run one at a time).
   */
  workers: process.env.CI ? 2 : 4,

  /**
   * Fail the entire test suite as soon as any test fails.
   * Useful in CI to get fast feedback. Set to false for local development.
   */
  fullyParallel: true,

  // ─── Reporter Configuration ──────────────────────────────────────────
  // Reporters generate output after tests run. We use MULTIPLE reporters
  // simultaneously — each serves a different purpose.

  reporter: [
    // 1. HTML Report — Playwright's built-in, great for debugging
    //    View with: npx playwright show-report
    ['html', { open: 'never' }],

    // 2. Allure Report — Industry-standard, great for management dashboards
    //    View with: npx allure serve allure-results
    ['allure-playwright'],

    // 3. Monocart Reporter — Modern, chart-rich, visual appeal
    //    Opens: test-results/monocart/report.html
    ['monocart-reporter', {
      name: 'PlaywrightBDD Framework Report',
      outputFile: './test-results/monocart/report.html',
    }],

    // 4. Custom Dashboard — Our own reporter with tailored metrics
    //    Opens: test-results/reports/dashboard.html
    ['./src/reporting/custom-reporter.ts', {
      outputDir: 'test-results/reports',
    }],

    // 5. Console list — Shows results in the terminal as tests run
    ['list'],
  ],

  // ─── Global "use" Settings ──────────────────────────────────────────
  // Default settings for ALL tests. Individual projects can override these.

  use: {
    /** Take a screenshot when a test fails (for debugging) */
    screenshot: 'only-on-failure',

    /** Record a video of tests that fail (for debugging) */
    video: 'retain-on-failure',

    /**
     * Record a trace for failing tests. Traces capture every action
     * (clicks, navigations, network requests) and let you replay them
     * in Playwright's Trace Viewer. Incredibly useful for debugging.
     */
    trace: 'retain-on-failure',

    /** Default action timeout (ms) — how long to wait for clicks, fills, etc. */
    actionTimeout: 15_000,

    /** Default navigation timeout (ms) — how long to wait for page loads */
    navigationTimeout: 30_000,
  },

  // ─── Projects Configuration ──────────────────────────────────────────
  // Each "project" defines a different way to run tests.

  projects: [
    // ══════════════════════════════════════════════════════════════════
    // 🌐 UI Tests — Run in Chromium (Google Chrome)
    // ══════════════════════════════════════════════════════════════════
    {
      ...defineBddProject({
        name: 'chromium',
        features: 'features/ui/**/*.feature',
        steps: 'steps/ui/**/*.ts',
      }),
      use: {
        ...devices['Desktop Chrome'],
        // Viewport size for consistent screenshots
        viewport: { width: 1280, height: 720 },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // 🦊 UI Tests — Run in Firefox
    // ══════════════════════════════════════════════════════════════════
    {
      ...defineBddProject({
        name: 'firefox',
        features: 'features/ui/**/*.feature',
        steps: 'steps/ui/**/*.ts',
      }),
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // 🍎 UI Tests — Run in WebKit (Safari)
    // ══════════════════════════════════════════════════════════════════
    {
      ...defineBddProject({
        name: 'webkit',
        features: 'features/ui/**/*.feature',
        steps: 'steps/ui/**/*.ts',
      }),
      use: {
        ...devices['Desktop Safari'],
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // 📡 API Tests — No browser needed!
    // ══════════════════════════════════════════════════════════════════
    // API tests run WITHOUT launching a browser, making them very fast.
    // They use Playwright's built-in HTTP client (APIRequestContext).
    {
      ...defineBddProject({
        name: 'api',
        features: 'features/api/**/*.feature',
        steps: 'steps/api/**/*.ts',
      }),
      use: {
        // Base URL for API requests — all paths are relative to this
        baseURL: 'https://jsonplaceholder.typicode.com',
      },
    },
  ],
});
