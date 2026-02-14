/**
 * ============================================================================
 * 📁 InventoryPage.ts — Page Object for SauceDemo Products/Inventory Page
 * ============================================================================
 *
 * PURPOSE:
 * Encapsulates interactions with the SauceDemo inventory page
 * (the page you see after successful login). This includes:
 *   - Viewing product list
 *   - Adding/removing items from cart
 *   - Sorting products
 *   - Navigating to cart
 *
 * FOR BEGINNERS:
 * This page appears AFTER you log in successfully. It shows a grid of
 * products (backpacks, t-shirts, etc.) that you can add to your cart.
 * ============================================================================
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class InventoryPage extends BasePage {
  // ═══════════════════════════════════════════════════════════════════
  // 📍 LOCATORS
  // ═══════════════════════════════════════════════════════════════════

  /** The page title ("Products") */
  readonly pageTitle: Locator;

  /** The sort dropdown (price low-high, name A-Z, etc.) */
  readonly sortDropdown: Locator;

  /** The shopping cart icon/link in the top-right */
  readonly cartLink: Locator;

  /** The badge showing number of items in cart */
  readonly cartBadge: Locator;

  /** The hamburger menu button (top-left) */
  readonly menuButton: Locator;

  /** The "Logout" link in the sidebar menu */
  readonly logoutLink: Locator;

  /**
   * Creates a new InventoryPage instance.
   *
   * @param page - The Playwright Page object
   */
  constructor(page: Page) {
    super(page, 'InventoryPage');

    // Define locators for page elements
    this.pageTitle = page.locator('.title');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.cartLink = page.locator('.shopping_cart_link');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.menuButton = page.locator('#react-burger-menu-btn');
    this.logoutLink = page.locator('#logout_sidebar_link');
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🎬 ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Adds a product to the cart by its name.
   *
   * HOW IT WORKS:
   * Each product has an "Add to cart" button next to it. This method
   * finds the product by name and clicks its "Add to cart" button.
   *
   * @param productName - The exact name of the product (e.g., "Sauce Labs Backpack")
   *
   * EXAMPLE:
   *   await inventoryPage.addProductToCart('Sauce Labs Backpack');
   */
  async addProductToCart(productName: string): Promise<void> {
    this.log.step(`Adding product to cart: "${productName}"`);

    // Find the inventory item that contains this product name,
    // then click its "Add to cart" button
    const productCard = this.page
      .locator('.inventory_item')
      .filter({ hasText: productName });

    await productCard
      .locator('button', { hasText: 'Add to cart' })
      .click();

    this.log.info(`✅ "${productName}" added to cart.`);
  }

  /**
   * Removes a product from the cart by its name.
   *
   * @param productName - The name of the product to remove
   */
  async removeProductFromCart(productName: string): Promise<void> {
    this.log.step(`Removing product from cart: "${productName}"`);

    const productCard = this.page
      .locator('.inventory_item')
      .filter({ hasText: productName });

    await productCard
      .locator('button', { hasText: 'Remove' })
      .click();

    this.log.info(`✅ "${productName}" removed from cart.`);
  }

  /**
   * Navigates to the shopping cart page.
   */
  async goToCart(): Promise<void> {
    this.log.step('Navigating to cart');
    await this.click(this.cartLink, 'Shopping Cart');
  }

  /**
   * Sorts products using the sort dropdown.
   *
   * @param sortOption - The visible text of the sort option
   *                     Options: "Name (A to Z)", "Name (Z to A)",
   *                              "Price (low to high)", "Price (high to low)"
   */
  async sortProducts(sortOption: string): Promise<void> {
    this.log.step(`Sorting products by: "${sortOption}"`);
    await this.selectOption(this.sortDropdown, sortOption, 'Sort Dropdown');
  }

  /**
   * Logs out of the application.
   */
  async logout(): Promise<void> {
    this.log.step('Logging out');
    await this.click(this.menuButton, 'Menu Button');
    await this.click(this.logoutLink, 'Logout Link');
    this.log.info('✅ Logged out successfully.');
  }

  // ═══════════════════════════════════════════════════════════════════
  // ✅ VERIFICATIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Verifies that the inventory page is displayed.
   */
  async verifyPageLoaded(): Promise<void> {
    this.log.step('Verifying inventory page loaded');
    await this.assertTextContains(this.pageTitle, 'Products', 'Page Title');
    this.log.info('✅ Inventory page loaded.');
  }

  /**
   * Verifies the number of items shown in the cart badge.
   *
   * @param expectedCount - The expected number (as a string, e.g., "2")
   */
  async verifyCartCount(expectedCount: string): Promise<void> {
    this.log.step(`Verifying cart count: ${expectedCount}`);
    await expect(this.cartBadge).toHaveText(expectedCount);
    this.log.info(`✅ Cart shows ${expectedCount} items.`);
  }

  /**
   * Gets the number of products displayed on the page.
   *
   * @returns The count of product cards visible
   */
  async getProductCount(): Promise<number> {
    const count = await this.page.locator('.inventory_item').count();
    this.log.info(`Products on page: ${count}`);
    return count;
  }
}
