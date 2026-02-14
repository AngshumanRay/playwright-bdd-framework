/**
 * ============================================================================
 * 📁 api.fixtures.ts — API Test Fixtures (Setup Crew for API Tests)
 * ============================================================================
 *
 * PURPOSE:
 * Creates and provides the ApiClient fixture for API step definitions.
 * API tests don't need a browser — they talk directly to the server
 * using HTTP requests. This fixture sets up the ApiClient with the
 * correct base URL and configuration.
 *
 * KEY DIFFERENCE FROM UI FIXTURES:
 *   UI Fixtures:  Provide page objects (LoginPage, etc.) that use a browser
 *   API Fixtures: Provide an ApiClient that makes HTTP requests (no browser)
 *
 * FOR BEGINNERS:
 * Just like UI fixtures give you a "LoginPage" to work with, API fixtures
 * give you an "apiClient" to make HTTP requests. Your step definitions
 * simply declare they need `apiClient` and it appears magically.
 * ============================================================================
 */

import { test as base, createBdd } from 'playwright-bdd';
import { ApiClient, ApiResponseData } from '../../src/api/client/ApiClient';
import { ENV_CONFIG } from '../../src/core/config/env.config';

/**
 * Define the types for our API test fixtures.
 */
type APIFixtures = {
  /** A pre-configured ApiClient for making HTTP requests */
  apiClient: ApiClient;
  /** Stores the most recent API response for step assertions */
  apiResponse: ApiResponseData;
};

/**
 * Extend Playwright's base test with API-specific fixtures.
 *
 * NOTE: We use Playwright's built-in `request` fixture which provides
 * an APIRequestContext — the engine that actually sends HTTP requests.
 * Our ApiClient wraps this with logging, retry logic, and helpers.
 */
export const test = base.extend<APIFixtures>({
  /**
   * ApiClient fixture.
   *
   * HOW IT WORKS:
   * 1. Playwright provides the `request` context (built-in HTTP client)
   * 2. We wrap it in our ApiClient for enhanced features
   * 3. The test uses `apiClient` to make requests
   */
  apiClient: async ({ request }, use) => {
    // Create an ApiClient using the built-in request context
    const client = new ApiClient(request, ENV_CONFIG.API_BASE_URL);
    await use(client);
  },

  /**
   * apiResponse fixture.
   *
   * This is a MUTABLE fixture that stores the most recent API response.
   * Step definitions write to it (When steps) and read from it (Then steps).
   *
   * WHY NOT USE A GLOBAL VARIABLE?
   * Global variables are shared across parallel tests and can cause
   * race conditions. Fixtures are isolated per test — each test gets
   * its own `apiResponse`, preventing interference between tests.
   */
  // eslint-disable-next-line no-empty-pattern
  apiResponse: async ({}, use) => {
    // Start with an empty placeholder response
    const response: ApiResponseData = {
      status: 0,
      statusText: '',
      body: null,
      rawBody: '',
      headers: {},
      responseTime: 0,
      url: '',
      method: '',
    };
    await use(response);
  },
});

/**
 * Export BDD step functions linked to our API fixtures.
 * Step definitions import Given, When, Then from THIS file
 * to get access to apiClient and apiResponse.
 */
export const { Given, When, Then } = createBdd(test);
