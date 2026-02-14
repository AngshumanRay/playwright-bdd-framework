# ============================================================================
# 📁 playwright_docs.feature — Playwright Documentation Site Scenarios
# ============================================================================
#
# WHAT IS THIS FILE?
# Tests the Playwright documentation website (https://playwright.dev/).
# This demonstrates that the framework can automate ANY website.
#
# NOTE: These tests depend on the Playwright website being available.
# If the website changes its structure, these tests may need updating.
# ============================================================================

@ui
Feature: Playwright Documentation Site
  As a developer
  I want to navigate the Playwright documentation
  So that I can learn how to use Playwright

  # ── Background ──────────────────────────────────────────────────────
  Background:
    Given I am on the Playwright homepage

  # ── Scenario: Get Started ───────────────────────────────────────────
  @smoke
  Scenario: Navigate to Get Started page
    When I click on the Get Started link
    Then the URL should contain "intro"
    And I should see "Installation" in the page heading

  # ── Scenario: Search ────────────────────────────────────────────────
  @regression
  Scenario: Search for documentation
    When I search for "Locators"
    And I click the first search result for "Locators"
    Then the page title should contain "Locators"
