# ============================================================================
# 📁 inventory.feature — Product Inventory BDD Scenarios
# ============================================================================
#
# WHAT IS THIS FILE?
# Tests the products/inventory page of SauceDemo — the page you see AFTER
# logging in. It covers browsing products, adding to cart, and sorting.
#
# WHY SEPARATE FILES?
# Each feature file focuses on ONE area of the application.
# This makes it easy to find, read, and maintain tests.
#   login.feature     → Login page behavior
#   inventory.feature → Products page behavior (this file)
#   cart.feature      → Shopping cart behavior (future)
# ============================================================================

@ui
Feature: Product Inventory
  As a logged-in user
  I want to browse and manage products
  So that I can shop effectively

  # ── Background ──────────────────────────────────────────────────────
  # Every scenario starts with a logged-in user on the inventory page.
  Background:
    Given I am logged in as a standard user

  # ── Scenario: View Products ─────────────────────────────────────────
  @smoke
  Scenario: Products are displayed after login
    Then I should see the products page title
    And I should see at least 1 product on the page

  # ── Scenario: Add to Cart ───────────────────────────────────────────
  @regression
  Scenario: Add a product to the cart
    When I add "Sauce Labs Backpack" to the cart
    Then the cart should show 1 item

  # ── Scenario: Remove from Cart ──────────────────────────────────────
  @regression
  Scenario: Remove a product from the cart
    When I add "Sauce Labs Backpack" to the cart
    And I remove "Sauce Labs Backpack" from the cart
    Then the cart should be empty

  # ── Scenario: Sort Products ─────────────────────────────────────────
  @regression
  Scenario: Sort products by name
    When I sort products by "Name (Z to A)"
    Then the products should be sorted correctly
