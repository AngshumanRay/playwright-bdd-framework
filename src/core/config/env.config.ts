/**
 * ============================================================================
 * 📁 env.config.ts — Environment Configuration Manager
 * ============================================================================
 *
 * PURPOSE:
 * This file centralizes ALL environment-specific settings (URLs, timeouts,
 * credentials) into one place. Instead of hardcoding values throughout your
 * tests, you reference them from here. This makes switching between
 * environments (dev, staging, production) effortless.
 *
 * HOW IT WORKS:
 * 1. It reads from a `.env` file (if present) or environment variables.
 * 2. It provides sensible defaults for every setting.
 * 3. All other files import from HERE, never hardcode URLs or credentials.
 *
 * FOR BEGINNERS:
 * Think of this as a "settings" screen for your entire test suite.
 * Want to test against a different server? Change it here, and ALL tests
 * automatically point to the new server.
 * ============================================================================
 */

import * as path from 'path';

/**
 * Interface defining all available environment settings.
 * Adding a new setting? Add it here first, then set its default below.
 */
export interface EnvironmentConfig {
  /** The name of the current environment (e.g., 'dev', 'staging', 'prod') */
  ENV_NAME: string;

  /** Base URL for the UI application under test */
  UI_BASE_URL: string;

  /** Base URL for the API under test */
  API_BASE_URL: string;

  /** Default timeout for page actions (in milliseconds) */
  DEFAULT_TIMEOUT: number;

  /** Timeout for API requests (in milliseconds) */
  API_TIMEOUT: number;

  /** Timeout for navigation (in milliseconds) */
  NAVIGATION_TIMEOUT: number;

  /** Whether to run the browser in headless mode (no visible window) */
  HEADLESS: boolean;

  /** How many times to retry a failed test before marking it as failed */
  RETRY_COUNT: number;

  /** Number of parallel workers (tests running at the same time) */
  WORKERS: number;

  /** Where to save test report files */
  REPORT_DIR: string;

  /** Where to save screenshots on failure */
  SCREENSHOT_DIR: string;

  /** Where to save test videos */
  VIDEO_DIR: string;

  /** Where to save trace files (for debugging) */
  TRACE_DIR: string;

  /** The viewport width for the browser window */
  VIEWPORT_WIDTH: number;

  /** The viewport height for the browser window */
  VIEWPORT_HEIGHT: number;

  /** Default username for login tests (SauceDemo) */
  DEFAULT_USERNAME: string;

  /** Default password for login tests (SauceDemo) */
  DEFAULT_PASSWORD: string;
}

/**
 * Reads an environment variable and returns its value,
 * or a fallback default if the variable is not set.
 *
 * @param key - The name of the environment variable (e.g., 'UI_BASE_URL')
 * @param defaultValue - What to use if the variable isn't set
 * @returns The value from the environment, or the default
 *
 * EXAMPLE:
 *   getEnvVar('UI_BASE_URL', 'https://www.saucedemo.com')
 *   // If UI_BASE_URL is set in your .env → returns that value
 *   // If UI_BASE_URL is NOT set → returns 'https://www.saucedemo.com'
 */
function getEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * The master configuration object.
 * Every setting your framework needs lives here.
 *
 * TO OVERRIDE A SETTING:
 *   Option 1: Create a `.env` file in the project root with KEY=VALUE pairs.
 *   Option 2: Set environment variables before running tests:
 *             `UI_BASE_URL=https://myapp.com npm test`
 */
export const ENV_CONFIG: EnvironmentConfig = {
  // ─── Environment Name ──────────────────────────────────────────────
  ENV_NAME: getEnvVar('ENV_NAME', 'development'),

  // ─── Application URLs ─────────────────────────────────────────────
  UI_BASE_URL: getEnvVar('UI_BASE_URL', 'https://www.saucedemo.com'),
  API_BASE_URL: getEnvVar('API_BASE_URL', 'https://jsonplaceholder.typicode.com'),

  // ─── Timeouts (in milliseconds) ───────────────────────────────────
  // 1000ms = 1 second. So 30000ms = 30 seconds.
  DEFAULT_TIMEOUT: parseInt(getEnvVar('DEFAULT_TIMEOUT', '30000')),
  API_TIMEOUT: parseInt(getEnvVar('API_TIMEOUT', '15000')),
  NAVIGATION_TIMEOUT: parseInt(getEnvVar('NAVIGATION_TIMEOUT', '30000')),

  // ─── Browser Settings ─────────────────────────────────────────────
  HEADLESS: getEnvVar('HEADLESS', 'true') === 'true',
  VIEWPORT_WIDTH: parseInt(getEnvVar('VIEWPORT_WIDTH', '1280')),
  VIEWPORT_HEIGHT: parseInt(getEnvVar('VIEWPORT_HEIGHT', '720')),

  // ─── Test Execution ───────────────────────────────────────────────
  RETRY_COUNT: parseInt(getEnvVar('RETRY_COUNT', '1')),
  WORKERS: parseInt(getEnvVar('WORKERS', '4')),

  // ─── Output Directories ───────────────────────────────────────────
  REPORT_DIR: getEnvVar('REPORT_DIR', 'test-results/reports'),
  SCREENSHOT_DIR: getEnvVar('SCREENSHOT_DIR', 'test-results/screenshots'),
  VIDEO_DIR: getEnvVar('VIDEO_DIR', 'test-results/videos'),
  TRACE_DIR: getEnvVar('TRACE_DIR', 'test-results/traces'),

  // ─── Test Credentials ─────────────────────────────────────────────
  // NOTE: In real projects, NEVER commit real credentials.
  // Use environment variables or a secrets manager instead.
  DEFAULT_USERNAME: getEnvVar('DEFAULT_USERNAME', 'standard_user'),
  DEFAULT_PASSWORD: getEnvVar('DEFAULT_PASSWORD', 'secret_sauce'),
};

/**
 * Helper to resolve paths relative to the project root.
 * This ensures paths work correctly regardless of where you run the tests from.
 *
 * @param relativePath - A path relative to the project root (e.g., 'test-results')
 * @returns The absolute path on your computer
 */
export function resolveProjectPath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}
