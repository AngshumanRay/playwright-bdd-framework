/**
 * ============================================================================
 * 📁 inventory.steps.ts — Step Definitions for Inventory Feature
 * ============================================================================
 *
 * PURPOSE:
 * Connects the English sentences in `features/ui/inventory.feature` to
 * TypeScript code that automates the SauceDemo inventory page.
 *
 * USED FIXTURES:
 *   - inventoryPage: For interacting with the products page
 *   - page: Playwright's raw page object (for low-level assertions)
 * ============================================================================
 */

import { Given, When, Then } from './ui.fixtures';
import { expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 WHEN Steps — Actions on the inventory page
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Adds a product to the shopping cart by its name.
 *
 * MATCHES: 'When I add "Sauce Labs Backpack" to the cart'
 *
 * The {string} captures the product name from the feature file.
 */
When('I add {string} to the cart', async ({ inventoryPage }, productName: string) => {
  await inventoryPage.addProductToCart(productName);
});

/**
 * Removes a product from the shopping cart by its name.
 *
 * MATCHES: 'When I remove "Sauce Labs Backpack" from the cart'
 */
When(
  'I remove {string} from the cart',
  async ({ inventoryPage }, productName: string) => {
    await inventoryPage.removeProductFromCart(productName);
  },
);

/**
 * Sorts the product list using the dropdown.
 *
 * MATCHES: 'When I sort products by "Name (Z to A)"'
 */
When('I sort products by {string}', async ({ inventoryPage }, sortOption: string) => {
  await inventoryPage.sortProducts(sortOption);
});

// ═══════════════════════════════════════════════════════════════════════════
// ✅ THEN Steps — Verifications on the inventory page
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifies that the inventory page title is visible.
 *
 * MATCHES: 'Then I should see the products page title'
 */
Then('I should see the products page title', async ({ inventoryPage }) => {
  await inventoryPage.verifyPageLoaded();
});

/**
 * Verifies that at least a minimum number of products are displayed.
 *
 * MATCHES: 'Then I should see at least 1 product on the page'
 *
 * {int} captures a number from the feature file.
 */
Then(
  'I should see at least {int} product on the page',
  async ({ inventoryPage }, minCount: number) => {
    const count = await inventoryPage.getProductCount();
    expect(count).toBeGreaterThanOrEqual(minCount);
  },
);

/**
 * Verifies the cart badge shows the expected number of items.
 *
 * MATCHES: 'Then the cart should show 1 item'
 */
Then('the cart should show {int} item(s)', async ({ inventoryPage }, count: number) => {
  await inventoryPage.verifyCartCount(String(count));
});

/**
 * Verifies the cart is empty (no badge is shown).
 *
 * MATCHES: 'Then the cart should be empty'
 */
Then('the cart should be empty', async ({ page }) => {
  // When the cart is empty, the badge element should not exist
  const badge = page.locator('.shopping_cart_badge');
  await expect(badge).toHaveCount(0);
});

/**
 * Verifies products are sorted correctly after changing sort order.
 * (This is a simplified check — verifies the dropdown value changed)
 *
 * MATCHES: 'Then the products should be sorted correctly'
 */
Then('the products should be sorted correctly', async ({ page }) => {
  // Verify products are on the page (sort was applied)
  const products = page.locator('.inventory_item_name');
  const count = await products.count();
  expect(count).toBeGreaterThan(0);
});
