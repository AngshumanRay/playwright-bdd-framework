# ============================================================================
# 📁 login.feature — Login Functionality BDD Scenarios
# ============================================================================
#
# WHAT IS THIS FILE?
# This is a "Feature File" written in Gherkin — a simple, human-readable
# language for describing software behavior. Non-technical people (managers,
# designers, QA) can read and understand these scenarios.
#
# GHERKIN KEYWORDS EXPLAINED:
#   Feature:     → Describes what area of the app we're testing
#   Background:  → Steps that run BEFORE every scenario (shared setup)
#   Scenario:    → One specific test case
#   Scenario Outline: → A template for multiple test cases with different data
#   Given:       → The starting condition (setup)
#   When:        → The action the user takes
#   Then:        → The expected result (what we verify)
#   And:         → Continues the previous Given/When/Then
#   Examples:    → Data table for Scenario Outlines
#
# TAGS EXPLAINED:
#   @ui         → This is a UI test (runs in a browser)
#   @smoke      → Critical test — run these first to catch major issues
#   @regression → Full test — run these for thorough coverage
#   @retries:2  → If this test fails, retry it up to 2 times
# ============================================================================

@ui
Feature: Login Functionality
  As a user of the SauceDemo application
  I want to be able to log in with valid credentials
  So that I can access the products inventory

  # ── Background ──────────────────────────────────────────────────────
  # This runs BEFORE every scenario below. It navigates to the login page
  # so we don't have to repeat that step in every scenario.
  Background:
    Given I am on the SauceDemo login page

  # ── Scenario: Happy Path ────────────────────────────────────────────
  # Tests that a valid user can log in successfully.
  @smoke
  Scenario: Successful login with standard user
    When I login with valid credentials
    Then I should be redirected to the inventory page
    And I should see the products page title

  # ── Scenario Outline: Error Cases ───────────────────────────────────
  # Tests multiple invalid login attempts using a data table.
  # The <placeholders> get replaced with values from the Examples table.
  @regression
  Scenario Outline: Failed login with invalid credentials
    When I login with "<username>" and "<password>"
    Then I should see the error message "<error_message>"

    # Each row below becomes a separate test:
    Examples:
      | username        | password     | error_message                                                             |
      | locked_out_user | secret_sauce | Epic sadface: Sorry, this user has been locked out.                       |
      | standard_user   | wrong_pass   | Epic sadface: Username and password do not match any user in this service |
      |                 | secret_sauce | Epic sadface: Username is required                                        |
      | standard_user   |              | Epic sadface: Password is required                                        |
