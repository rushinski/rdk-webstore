import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../utils/state";
import { createPaidOrder, createPendingOrder, createProductWithVariant } from "../../helpers/fixtures";

test.describe("Checkout flow", () => {
  test("completes checkout and lands on success", async ({ page }) => {
    const base = await resetAndSeedForE2E();
    const { productId, variantId } = await createProductWithVariant({
      tenantId: base.tenantId,
      marketplaceId: base.marketplaceId,
      sku: "SKU-E2E-CHECKOUT-1",
      stock: 5,
      priceCents: 22000,
    });

    const paidOrder = await createPaidOrder({
      tenantId: base.tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 220,
      fulfillment: "pickup",
    });

    await page.addInitScript(
      ([productId, variantId]) => {
        localStorage.setItem(
          "rdk_cart",
          JSON.stringify([
            {
              productId,
              variantId,
              sizeLabel: "10",
              brand: "Nike",
              name: "Air Test",
              titleDisplay: "Nike Air Test",
              priceCents: 22000,
              imageUrl: "/placeholder.png",
              quantity: 1,
              maxStock: 5,
            },
          ])
        );
      },
      [productId, variantId]
    );

    await page.route("/api/checkout/create-payment-intent", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clientSecret: "cs_test_e2e",
          orderId: paidOrder.id,
          paymentIntentId: paidOrder.stripe_payment_intent_id ?? "pi_test_e2e",
          subtotal: Number(paidOrder.subtotal ?? 0),
          shipping: Number(paidOrder.shipping ?? 0),
          total: Number(paidOrder.total ?? 0),
          fulfillment: paidOrder.fulfillment ?? "pickup",
        }),
      });
    });

    await page.route("/api/checkout/confirm-payment", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, alreadyPaid: true }),
      });
    });

    await page.route(new RegExp(`/api/orders/${paidOrder.id}`), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: paidOrder.id,
          status: "paid",
          subtotal: Number(paidOrder.subtotal ?? 0),
          shipping: Number(paidOrder.shipping ?? 0),
          total: Number(paidOrder.total ?? 0),
          fulfillment: paidOrder.fulfillment ?? "pickup",
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto(
      `/checkout?e2e_payment_status=success&e2e_payment_intent_id=pi_test_e2e`
    );
    const submitSuccess = page.locator('[data-testid="checkout-submit"]');
    await submitSuccess.waitFor();
    await submitSuccess.scrollIntoViewIfNeeded();
    await expect(submitSuccess).toBeEnabled();
    await submitSuccess.click();

    await page.waitForURL(new RegExp(`/checkout/success\\?orderId=${paidOrder.id}`));
    await expect(page.getByText("Order Confirmed!")).toBeVisible();
  });

  test("handles non-card processing without hanging", async ({ page }) => {
    const base = await resetAndSeedForE2E();
    const { productId, variantId } = await createProductWithVariant({
      tenantId: base.tenantId,
      marketplaceId: base.marketplaceId,
      sku: "SKU-E2E-CHECKOUT-2",
      stock: 5,
      priceCents: 18000,
    });

    const pendingOrder = await createPendingOrder({
      tenantId: base.tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 180,
      fulfillment: "pickup",
    });

    await page.addInitScript(
      ([productId, variantId]) => {
        localStorage.setItem(
          "rdk_cart",
          JSON.stringify([
            {
              productId,
              variantId,
              sizeLabel: "10",
              brand: "Nike",
              name: "Air Test",
              titleDisplay: "Nike Air Test",
              priceCents: 18000,
              imageUrl: "/placeholder.png",
              quantity: 1,
              maxStock: 5,
            },
          ])
        );
      },
      [productId, variantId]
    );

    await page.route("/api/checkout/create-payment-intent", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clientSecret: "cs_test_processing",
          orderId: pendingOrder.id,
          paymentIntentId: "pi_test_processing",
          subtotal: Number(pendingOrder.subtotal ?? 0),
          shipping: Number(pendingOrder.shipping ?? 0),
          total: Number(pendingOrder.total ?? 0),
          fulfillment: pendingOrder.fulfillment ?? "pickup",
        }),
      });
    });

    await page.goto(
      `/checkout?e2e_payment_status=processing&e2e_payment_intent_id=pi_test_processing`
    );
    const submitProcessing = page.locator('[data-testid="checkout-submit"]');
    await submitProcessing.waitFor();
    await submitProcessing.scrollIntoViewIfNeeded();
    await expect(submitProcessing).toBeEnabled();
    await submitProcessing.click();

    await expect(page.locator('[data-testid="checkout-processing"]')).toBeVisible();
    await expect(page.locator('[data-testid="processing-message"]')).toContainText(
      "E2E forced status: processing"
    );
  });
});
