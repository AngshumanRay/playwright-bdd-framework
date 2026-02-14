/**
 * ============================================================================
 * 📁 api.steps.ts — Step Definitions for API Features
 * ============================================================================
 *
 * PURPOSE:
 * Connects the English sentences in `features/api/*.feature` to TypeScript
 * code that makes HTTP requests and validates responses.
 *
 * KEY CONCEPT:
 * API step definitions work differently from UI steps:
 *   - UI steps: Use page objects to interact with a browser
 *   - API steps: Use the ApiClient to send HTTP requests to a server
 *
 * RESPONSE SHARING:
 * Steps need to SHARE data (e.g., a When step makes a request, and a Then
 * step checks the response). We use a shared variable `lastResponse` to
 * pass the response between steps within the same scenario.
 *
 * FOR BEGINNERS:
 * These steps make the framework incredibly flexible:
 *   - 'When I send a GET request to "/users"' works for ANY URL
 *   - 'Then the API response status should be 200' works for ANY status
 *   - You can add new API tests just by writing feature files — no new code needed!
 * ============================================================================
 */

import { Given, When, Then } from './api.fixtures';
import { expect } from '@playwright/test';
import { ApiClient, ApiResponseData } from '../../src/api/client/ApiClient';
import { ENV_CONFIG } from '../../src/core/config/env.config';

/**
 * Shared storage for the most recent API response.
 *
 * WHY A MODULE-LEVEL VARIABLE?
 * Within a single scenario, steps run sequentially and share this state.
 * Each scenario gets a fresh start because step definitions are re-invoked.
 *
 * FLOW:
 *   When step → makes request → stores response here
 *   Then step → reads response from here → validates it
 */
let lastResponse: ApiResponseData;

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 WHEN Steps — Making API Requests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sends a GET request to the specified path.
 *
 * MATCHES: 'When I send a GET request to "/users?page=2"'
 *
 * HOW IT WORKS:
 * 1. Takes the path from the feature file (e.g., "/users?page=2")
 * 2. Prepends the base URL from config (e.g., "https://reqres.in/api")
 * 3. Makes the HTTP GET request
 * 4. Stores the response for subsequent Then steps
 */
When(
  'I send a GET request to {string}',
  async ({ apiClient }, path: string) => {
    lastResponse = await apiClient.get(path);
  },
);

/**
 * Sends a POST request with a JSON body.
 *
 * MATCHES: 'When I send a POST request to "/users" with body:'
 * Followed by a doc string containing JSON:
 *   """json
 *   { "name": "Neo", "job": "The One" }
 *   """
 *
 * The `docString` parameter captures everything between the triple quotes.
 */
When(
  'I send a POST request to {string} with body:',
  async ({ apiClient }, path: string, docString: string) => {
    // Parse the JSON string from the feature file into an object
    const body = JSON.parse(docString);
    lastResponse = await apiClient.post(path, { body });
  },
);

/**
 * Sends a PUT request with a JSON body.
 *
 * MATCHES: 'When I send a PUT request to "/users/2" with body:'
 */
When(
  'I send a PUT request to {string} with body:',
  async ({ apiClient }, path: string, docString: string) => {
    const body = JSON.parse(docString);
    lastResponse = await apiClient.put(path, { body });
  },
);

/**
 * Sends a PATCH request with a JSON body.
 *
 * MATCHES: 'When I send a PATCH request to "/users/2" with body:'
 */
When(
  'I send a PATCH request to {string} with body:',
  async ({ apiClient }, path: string, docString: string) => {
    const body = JSON.parse(docString);
    lastResponse = await apiClient.patch(path, { body });
  },
);

/**
 * Sends a DELETE request.
 *
 * MATCHES: 'When I send a DELETE request to "/users/2"'
 */
When(
  'I send a DELETE request to {string}',
  async ({ apiClient }, path: string) => {
    lastResponse = await apiClient.delete(path);
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// ✅ THEN Steps — Validating API Responses
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates the HTTP status code of the response.
 *
 * MATCHES: 'Then the API response status should be 200'
 *
 * {int} captures a number (200, 201, 404, etc.) from the feature file.
 */
Then(
  'the API response status should be {int}',
  // eslint-disable-next-line no-empty-pattern
  async ({}, expectedStatus: number) => {
    expect(lastResponse.status).toBe(expectedStatus);
  },
);

/**
 * Validates that the response body contains a specific string.
 * Works with both JSON and plain text responses.
 *
 * MATCHES: 'Then the API response should contain "page"'
 */
Then(
  'the API response should contain {string}',
  // eslint-disable-next-line no-empty-pattern
  async ({}, expectedText: string) => {
    const bodyString =
      typeof lastResponse.body === 'object'
        ? JSON.stringify(lastResponse.body)
        : String(lastResponse.body);
    expect(bodyString).toContain(expectedText);
  },
);

/**
 * Validates a specific nested field in the response body.
 * Supports dot notation for nested fields (e.g., "data.id").
 *
 * MATCHES: 'Then the API response field "data.id" should equal 2'
 *
 * HOW DOT NOTATION WORKS:
 *   "data.id" → response.body.data.id
 *   "name"    → response.body.name
 */
Then(
  'the API response field {string} should equal {int}',
  // eslint-disable-next-line no-empty-pattern
  async ({}, fieldPath: string, expectedValue: number) => {
    // Split the path by dots and traverse the object
    const value = fieldPath
      .split('.')
      .reduce((obj: any, key: string) => obj?.[key], lastResponse.body as any);
    expect(value).toBe(expectedValue);
  },
);

/**
 * Validates that the API response time is within an acceptable range.
 *
 * MATCHES: 'Then the API response time should be under 5000 ms'
 */
Then(
  'the API response time should be under {int} ms',
  // eslint-disable-next-line no-empty-pattern
  async ({}, maxTime: number) => {
    expect(lastResponse.responseTime).toBeLessThan(maxTime);
  },
);
