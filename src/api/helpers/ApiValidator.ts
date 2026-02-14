/**
 * ============================================================================
 * 📁 ApiValidator.ts — API Response Validation Helpers
 * ============================================================================
 *
 * PURPOSE:
 * Provides reusable assertion helpers for API responses. Instead of writing
 * the same validation logic in every step definition, use these helpers
 * for consistent, readable, and well-logged assertions.
 *
 * FOR BEGINNERS:
 * After making an API request, you need to CHECK that the response is correct.
 * This file gives you easy-to-use methods like:
 *   - "Is the status code 200?"
 *   - "Does the response body contain 'name'?"
 *   - "Is the response JSON valid?"
 *
 * These methods also log everything, so if a check fails, the log shows
 * you EXACTLY what went wrong.
 * ============================================================================
 */

import { expect } from '@playwright/test';
import { Logger } from '../../core/utils/logger';
import { ApiResponseData } from '../client/ApiClient';

/** Logger for this module */
const log = new Logger('ApiValidator');

/**
 * Validates that the response has a specific HTTP status code.
 *
 * @param response - The API response to validate
 * @param expectedStatus - The expected HTTP status code (e.g., 200, 201, 404)
 *
 * EXAMPLE:
 *   const response = await api.get('/users');
 *   validateStatus(response, 200); // Passes ✅
 *   validateStatus(response, 404); // Fails ❌
 */
export function validateStatus(response: ApiResponseData, expectedStatus: number): void {
  log.info(`Validating status: expected ${expectedStatus}, got ${response.status}`);
  expect(response.status).toBe(expectedStatus);
  log.info(`✅ Status ${expectedStatus} verified.`);
}

/**
 * Validates that the response body contains a specific key.
 *
 * @param response - The API response to validate
 * @param key - The key to look for in the response body
 *
 * EXAMPLE:
 *   // If response body is { "id": 1, "name": "Neo" }
 *   validateBodyContainsKey(response, 'id');   // Passes ✅
 *   validateBodyContainsKey(response, 'age');   // Fails ❌
 */
export function validateBodyContainsKey(response: ApiResponseData, key: string): void {
  log.info(`Validating response body contains key: "${key}"`);
  const bodyString = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
  expect(bodyString).toContain(key);
  log.info(`✅ Response body contains "${key}".`);
}

/**
 * Validates that the response body contains a specific value.
 *
 * @param response - The API response to validate
 * @param key - The key to check
 * @param expectedValue - The expected value for that key
 *
 * EXAMPLE:
 *   // If response body is { "name": "Neo", "job": "The One" }
 *   validateBodyFieldEquals(response, 'name', 'Neo'); // Passes ✅
 */
export function validateBodyFieldEquals(
  response: ApiResponseData,
  key: string,
  expectedValue: any,
): void {
  log.info(`Validating body.${key} === ${JSON.stringify(expectedValue)}`);
  expect(response.body[key]).toBe(expectedValue);
  log.info(`✅ body.${key} equals expected value.`);
}

/**
 * Validates that the response body is a valid JSON array with items.
 *
 * @param response - The API response to validate
 * @param arrayKey - The key in the body that should be an array (e.g., 'data')
 *
 * EXAMPLE:
 *   // If response body is { "data": [{ id: 1 }, { id: 2 }] }
 *   validateBodyIsArray(response, 'data'); // Passes ✅
 */
export function validateBodyIsArray(response: ApiResponseData, arrayKey: string): void {
  log.info(`Validating body.${arrayKey} is a non-empty array`);
  expect(Array.isArray(response.body[arrayKey])).toBe(true);
  expect(response.body[arrayKey].length).toBeGreaterThan(0);
  log.info(`✅ body.${arrayKey} is an array with ${response.body[arrayKey].length} items.`);
}

/**
 * Validates that the API response time is within an acceptable threshold.
 *
 * @param response - The API response to validate
 * @param maxTimeMs - Maximum acceptable response time in milliseconds
 *
 * EXAMPLE:
 *   validateResponseTime(response, 2000); // Fails if > 2 seconds
 */
export function validateResponseTime(response: ApiResponseData, maxTimeMs: number): void {
  log.info(`Validating response time: ${response.responseTime}ms <= ${maxTimeMs}ms`);
  expect(response.responseTime).toBeLessThanOrEqual(maxTimeMs);
  log.info(`✅ Response time (${response.responseTime}ms) is within threshold.`);
}

/**
 * Validates that the response contains specific headers.
 *
 * @param response - The API response to validate
 * @param expectedHeaders - Object with header names and expected values
 *
 * EXAMPLE:
 *   validateHeaders(response, { 'content-type': 'application/json' });
 */
export function validateHeaders(
  response: ApiResponseData,
  expectedHeaders: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(expectedHeaders)) {
    log.info(`Validating header: ${key} contains "${value}"`);
    const actualValue = response.headers[key.toLowerCase()];
    expect(actualValue).toContain(value);
    log.info(`✅ Header "${key}" verified.`);
  }
}

/**
 * Validates the response body against a JSON Schema-like structure.
 * This checks that all required fields exist and are of the correct type.
 *
 * @param response - The API response to validate
 * @param schema - An object describing expected fields and their types
 *
 * EXAMPLE:
 *   validateSchema(response, {
 *     id: 'number',
 *     name: 'string',
 *     createdAt: 'string',
 *   });
 */
export function validateSchema(
  response: ApiResponseData,
  schema: Record<string, string>,
): void {
  log.info('Validating response body against schema');

  for (const [field, expectedType] of Object.entries(schema)) {
    const actualValue = response.body[field];
    const actualType = typeof actualValue;

    log.debug(`  ${field}: expected "${expectedType}", got "${actualType}" (value: ${actualValue})`);
    expect(actualValue).toBeDefined();
    expect(actualType).toBe(expectedType);
  }

  log.info(`✅ Schema validation passed (${Object.keys(schema).length} fields verified).`);
}
