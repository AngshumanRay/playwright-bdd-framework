# ============================================================================
# 📁 network_intercept.feature — Network Interception & Mocking Scenarios
# ============================================================================
#
# WHAT IS THIS FILE?
# Tests network interception capabilities — intercepting API calls made by
# the browser and replacing them with mock (fake) responses.
#
# WHY MOCK API RESPONSES?
# 1. Speed: No need to wait for a real server
# 2. Reliability: Tests don't fail because an external API is down
# 3. Control: You can test edge cases (errors, empty responses, etc.)
# 4. Isolation: Test the frontend without backend dependencies
#
# NOTE: These scenarios use BOTH browser (for the UI) and API interception,
# so they need to run in a browser context.
# ============================================================================

@ui @mock
Feature: Network Interception and Mocking
  As a test engineer
  I want to intercept and mock network requests
  So that I can test the frontend independently of the backend

  @regression
  Scenario: Mock search API responses
    Given I intercept the search API to return mocked results
    And I am on the Playwright homepage
    When I search for "Mocked"
    Then I should see "Mocked Result" in the search results

  @smoke
  Scenario: Verify page responds with correct status
    Given I am on the Playwright homepage
    When I send a direct request to "https://playwright.dev/"
    Then the direct response status should be 200
