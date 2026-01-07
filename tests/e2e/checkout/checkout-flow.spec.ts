// tests/e2e/checkout-flow.spec.ts

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Checkout Flow Tests
 * 
 * These tests cover the complete checkout journey:
 * 1. Browse products
 * 2. Add to cart
 * 3. View cart
 * 4. Enter shipping info
 * 5. Select shipping method
 * 6. Enter payment info
 * 7. Complete payment
 * 8. Verify order confirmation
 * 
 * Tests use data-testid for stable selectors.
 * No arbitrary sleeps - use waitFor with conditions.
 */

test.describe('Checkout Flow - Happy Path', () => {
  let testUserEmail: string;
  let testUserPassword: string;

  test.beforeAll(async () => {
    // Create test user
    const timestamp = Date.now();
    testUserEmail = `e2e-checkout-${timestamp}@test.com`;
    testUserPassword = 'TestPass123!';

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: testUserPassword,
      email_confirm: true
    });
  });

  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('/auth/signin');
    await page.getByTestId('email-input').fill(testUserEmail);
    await page.getByTestId('password-input').fill(testUserPassword);
    await page.getByTestId('signin-button').click();

    // Wait for redirect to home
    await expect(page).toHaveURL('/');
  });

  test('complete checkout flow with card payment', async ({ page }) => {
    // Step 1: Navigate to store
    await page.goto('/store');
    await expect(page.getByTestId('storefront-page')).toBeVisible();

    // Step 2: Select a product
    const firstProduct = page.getByTestId('product-card').first();
    await firstProduct.click();

    // Step 3: View product details
    await expect(page.getByTestId('product-detail-page')).toBeVisible();
    const productName = await page.getByTestId('product-name').textContent();
    const productPrice = await page.getByTestId('product-price').textContent();

    // Step 4: Add to cart
    await page.getByTestId('add-to-cart-button').click();

    // Wait for success message
    await expect(page.getByTestId('cart-success-message')).toBeVisible();

    // Step 5: Navigate to cart
    await page.getByTestId('cart-icon').click();
    await expect(page).toHaveURL('/cart');

    // Verify cart contains the product
    await expect(page.getByTestId('cart-item-name')).toContainText(productName!);
    await expect(page.getByTestId('cart-item-price')).toContainText(productPrice!);

    // Step 6: Proceed to checkout
    await page.getByTestId('checkout-button').click();
    await expect(page).toHaveURL(/\/checkout/);

    // Step 7: Fill shipping information
    await page.getByTestId('shipping-name').fill('Test User');
    await page.getByTestId('shipping-address').fill('123 Test St');
    await page.getByTestId('shipping-city').fill('Steelton');
    await page.getByTestId('shipping-state').selectOption('PA');
    await page.getByTestId('shipping-zip').fill('17113');
    await page.getByTestId('shipping-phone').fill('717-555-1234');

    await page.getByTestId('continue-to-shipping-button').click();

    // Step 8: Wait for shipping options to load
    await expect(page.getByTestId('shipping-options-section')).toBeVisible();
    
    // Wait for loading skeleton to disappear
    await expect(page.getByTestId('shipping-loading-skeleton')).not.toBeVisible({ timeout: 5000 });

    // Select shipping method
    const standardShipping = page.getByTestId('shipping-option-standard');
    await expect(standardShipping).toBeVisible();
    await standardShipping.click();

    await page.getByTestId('continue-to-payment-button').click();

    // Step 9: Enter payment information (Stripe test mode)
    await expect(page.getByTestId('payment-section')).toBeVisible();

    // Wait for Stripe Elements to load
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await expect(cardElement.locator('[name="cardnumber"]')).toBeVisible({ timeout: 10000 });

    // Fill Stripe card details (test card)
    await cardElement.locator('[name="cardnumber"]').fill('4242424242424242');
    await cardElement.locator('[name="exp-date"]').fill('12/25');
    await cardElement.locator('[name="cvc"]').fill('123');
    await cardElement.locator('[name="postal"]').fill('17113');

    // Step 10: Submit payment
    await page.getByTestId('submit-payment-button').click();

    // Wait for payment processing (should not hang)
    await expect(page.getByTestId('payment-processing')).toBeVisible();

    // Wait for redirect to confirmation page (max 30s, not infinite)
    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 30000 });

    // Step 11: Verify order confirmation
    await expect(page.getByTestId('order-confirmation-page')).toBeVisible();
    await expect(page.getByTestId('order-number')).toBeVisible();
    await expect(page.getByTestId('order-total')).toBeVisible();

    // Verify order number format
    const orderNumber = await page.getByTestId('order-number').textContent();
    expect(orderNumber).toMatch(/^ORD-\d+$/);

    // Step 12: Verify email sent (check for confirmation message)
    await expect(page.getByTestId('email-confirmation-message')).toBeVisible();
  });

  test('should validate shipping information', async ({ page }) => {
    await page.goto('/checkout');

    // Try to continue without filling required fields
    await page.getByTestId('continue-to-shipping-button').click();

    // Should show validation errors
    await expect(page.getByTestId('shipping-name-error')).toBeVisible();
    await expect(page.getByTestId('shipping-address-error')).toBeVisible();
    await expect(page.getByTestId('shipping-city-error')).toBeVisible();

    // Should not proceed
    await expect(page.getByTestId('shipping-options-section')).not.toBeVisible();
  });

  test('should validate invalid shipping address', async ({ page }) => {
    await page.goto('/checkout');

    // Fill with invalid address
    await page.getByTestId('shipping-name').fill('Test User');
    await page.getByTestId('shipping-address').fill('Invalid Address 99999');
    await page.getByTestId('shipping-city').fill('InvalidCity');
    await page.getByTestId('shipping-state').selectOption('PA');
    await page.getByTestId('shipping-zip').fill('00000'); // Invalid ZIP

    await page.getByTestId('continue-to-shipping-button').click();

    // Should show address validation error
    await expect(page.getByTestId('address-validation-error')).toBeVisible({ timeout: 5000 });
  });

  test('should prevent tampering with shipping cost', async ({ page }) => {
    // Complete checkout flow normally
    await page.goto('/store');
    await page.getByTestId('product-card').first().click();
    await page.getByTestId('add-to-cart-button').click();
    await page.goto('/cart');
    await page.getByTestId('checkout-button').click();

    // Fill shipping info
    await page.getByTestId('shipping-name').fill('Test User');
    await page.getByTestId('shipping-address').fill('123 Test St');
    await page.getByTestId('shipping-city').fill('Steelton');
    await page.getByTestId('shipping-state').selectOption('PA');
    await page.getByTestId('shipping-zip').fill('17113');

    await page.getByTestId('continue-to-shipping-button').click();
    await expect(page.getByTestId('shipping-options-section')).toBeVisible();

    // Get the actual shipping cost
    const shippingCost = await page.getByTestId('shipping-option-standard-price').textContent();

    // Try to tamper with it via console/devtools
    await page.evaluate(() => {
      // Attempt to modify shipping cost in localStorage/sessionStorage
      localStorage.setItem('shippingCost', '0.01');
      sessionStorage.setItem('shippingCost', '0.01');
    });

    await page.getByTestId('shipping-option-standard').click();
    await page.getByTestId('continue-to-payment-button').click();

    // Get final total from payment page
    const finalTotal = await page.getByTestId('order-total').textContent();

    // Server should use correct shipping cost, not tampered value
    expect(finalTotal).not.toContain('0.01');
    expect(finalTotal).toContain(shippingCost!);
  });

  test('should prevent tampering with item prices', async ({ page }) => {
    await page.goto('/store');
    await page.getByTestId('product-card').first().click();

    // Get real price
    const realPrice = await page.getByTestId('product-price').textContent();

    // Tamper with price in browser
    await page.evaluate(() => {
      const priceElement = document.querySelector('[data-testid="product-price"]');
      if (priceElement) {
        priceElement.textContent = '$1.00';
      }
    });

    await page.getByTestId('add-to-cart-button').click();
    await page.goto('/cart');

    // Cart should show real price from server
    const cartPrice = await page.getByTestId('cart-item-price').textContent();
    expect(cartPrice).toBe(realPrice);

    // Complete checkout
    await page.getByTestId('checkout-button').click();
    
    // ... fill shipping info ...
    await page.getByTestId('shipping-name').fill('Test User');
    await page.getByTestId('shipping-address').fill('123 Test St');
    await page.getByTestId('shipping-city').fill('Steelton');
    await page.getByTestId('shipping-state').selectOption('PA');
    await page.getByTestId('shipping-zip').fill('17113');
    await page.getByTestId('continue-to-shipping-button').click();

    await expect(page.getByTestId('shipping-options-section')).toBeVisible();
    await page.getByTestId('shipping-option-standard').click();
    await page.getByTestId('continue-to-payment-button').click();

    // Order total should use real price
    const orderTotal = await page.getByTestId('order-total').textContent();
    expect(orderTotal).toContain(realPrice!.replace('$', ''));
  });

  test('should handle payment declined gracefully', async ({ page }) => {
    // Use card that will be declined
    await page.goto('/store');
    await page.getByTestId('product-card').first().click();
    await page.getByTestId('add-to-cart-button').click();
    await page.goto('/cart');
    await page.getByTestId('checkout-button').click();

    // Fill shipping
    await page.getByTestId('shipping-name').fill('Test User');
    await page.getByTestId('shipping-address').fill('123 Test St');
    await page.getByTestId('shipping-city').fill('Steelton');
    await page.getByTestId('shipping-state').selectOption('PA');
    await page.getByTestId('shipping-zip').fill('17113');
    await page.getByTestId('continue-to-shipping-button').click();

    await expect(page.getByTestId('shipping-options-section')).toBeVisible();
    await page.getByTestId('shipping-option-standard').click();
    await page.getByTestId('continue-to-payment-button').click();

    // Use declined test card
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4000000000000002'); // Declined card
    await cardElement.locator('[name="exp-date"]').fill('12/25');
    await cardElement.locator('[name="cvc"]').fill('123');
    await cardElement.locator('[name="postal"]').fill('17113');

    await page.getByTestId('submit-payment-button').click();

    // Should show error message
    await expect(page.getByTestId('payment-error')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('payment-error')).toContainText(/declined|failed/i);

    // Should stay on payment page
    await expect(page.getByTestId('payment-section')).toBeVisible();

    // Should allow retry
    await expect(page.getByTestId('submit-payment-button')).toBeEnabled();
  });

  test('should handle insufficient funds gracefully', async ({ page }) => {
    await page.goto('/store');
    await page.getByTestId('product-card').first().click();
    await page.getByTestId('add-to-cart-button').click();
    await page.goto('/cart');
    await page.getByTestId('checkout-button').click();

    // Fill shipping
    await page.getByTestId('shipping-name').fill('Test User');
    await page.getByTestId('shipping-address').fill('123 Test St');
    await page.getByTestId('shipping-city').fill('Steelton');
    await page.getByTestId('shipping-state').selectOption('PA');
    await page.getByTestId('shipping-zip').fill('17113');
    await page.getByTestId('continue-to-shipping-button').click();

    await expect(page.getByTestId('shipping-options-section')).toBeVisible();
    await page.getByTestId('shipping-option-standard').click();
    await page.getByTestId('continue-to-payment-button').click();

    // Use insufficient funds test card
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4000000000009995'); // Insufficient funds
    await cardElement.locator('[name="exp-date"]').fill('12/25');
    await cardElement.locator('[name="cvc"]').fill('123');
    await cardElement.locator('[name="postal"]').fill('17113');

    await page.getByTestId('submit-payment-button').click();

    await expect(page.getByTestId('payment-error')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('payment-error')).toContainText(/insufficient|funds/i);
  });

  test('should prevent double submission', async ({ page }) => {
    await page.goto('/store');
    await page.getByTestId('product-card').first().click();
    await page.getByTestId('add-to-cart-button').click();
    await page.goto('/cart');
    await page.getByTestId('checkout-button').click();

    // Fill shipping
    await page.getByTestId('shipping-name').fill('Test User');
    await page.getByTestId('shipping-address').fill('123 Test St');
    await page.getByTestId('shipping-city').fill('Steelton');
    await page.getByTestId('shipping-state').selectOption('PA');
    await page.getByTestId('shipping-zip').fill('17113');
    await page.getByTestId('continue-to-shipping-button').click();

    await expect(page.getByTestId('shipping-options-section')).toBeVisible();
    await page.getByTestId('shipping-option-standard').click();
    await page.getByTestId('continue-to-payment-button').click();

    // Fill payment
    const cardElement = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardElement.locator('[name="cardnumber"]').fill('4242424242424242');
    await cardElement.locator('[name="exp-date"]').fill('12/25');
    await cardElement.locator('[name="cvc"]').fill('123');
    await cardElement.locator('[name="postal"]').fill('17113');

    // Click submit button multiple times rapidly
    const submitButton = page.getByTestId('submit-payment-button');
    await submitButton.click();
    await submitButton.click(); // Double click

    // Button should be disabled after first click
    await expect(submitButton).toBeDisabled();

    // Should only create one order
    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 30000 });
    
    const orderNumber = await page.getByTestId('order-number').textContent();
    
    // Verify only one order was created in database
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber);

    expect(orders?.length).toBe(1);
  });
});

test.describe('Checkout Flow - Edge Cases', () => {
  test('should handle session expiry during checkout', async ({ page }) => {
    // Start checkout
    await page.goto('/store');
    // ... add to cart ...

    // Simulate session expiry
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to proceed to checkout
    await page.goto('/checkout');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    await context.route('**/api/checkout/**', route => route.abort());

    await page.goto('/checkout');
    
    // Fill form and try to submit
    // Should show network error message
    await expect(page.getByTestId('network-error')).toBeVisible({ timeout: 10000 });
  });

  test('should preserve cart across page refreshes', async ({ page }) => {
    await page.goto('/store');
    await page.getByTestId('product-card').first().click();
    await page.getByTestId('add-to-cart-button').click();

    const productName = await page.getByTestId('product-name').textContent();

    // Refresh page
    await page.reload();

    // Cart should still have the item
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item-name')).toContainText(productName!);
  });
});