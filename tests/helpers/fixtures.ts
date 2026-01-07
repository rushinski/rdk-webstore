import { createAdminClient } from "./supabase";
import { OrdersRepository } from "@/repositories/orders-repo";

export async function createProductWithVariant(params: {
  tenantId: string;
  marketplaceId: string;
  sku: string;
  category?: string;
  brand?: string;
  name?: string;
  priceCents?: number;
  stock?: number;
  sizeLabel?: string;
  sizeType?: "shoe" | "clothing" | "custom" | "none";
}) {
  const admin = createAdminClient();
  const {
    tenantId,
    marketplaceId,
    sku,
    category = "sneakers",
    brand = "Nike",
    name = "Air Test",
    priceCents = 20000,
    stock = 3,
    sizeLabel = "10",
    sizeType = "shoe",
  } = params;

  const title = `${brand} ${name}`.trim();

  const { data: product, error: productError } = await admin
    .from("products")
    .insert({
      tenant_id: tenantId,
      marketplace_id: marketplaceId,
      sku,
      category,
      brand,
      name,
      condition: "new",
      title_raw: title,
      title_display: title,
      is_active: true,
      is_out_of_stock: false,
      cost_cents: Math.round(priceCents * 0.6),
    })
    .select("id")
    .single();

  if (productError) throw productError;

  const { data: variant, error: variantError } = await admin
    .from("product_variants")
    .insert({
      product_id: product.id,
      size_type: sizeType,
      size_label: sizeLabel,
      price_cents: priceCents,
      stock,
    })
    .select("id")
    .single();

  if (variantError) throw variantError;

  return { productId: product.id as string, variantId: variant.id as string };
}

export async function createPendingOrder(params: {
  userId?: string | null;
  tenantId: string;
  productId: string;
  variantId: string;
  quantity?: number;
  unitPrice?: number;
  unitCost?: number;
  fulfillment?: "ship" | "pickup";
}) {
  const admin = createAdminClient();
  const repo = new OrdersRepository(admin);
  const {
    userId = null,
    tenantId,
    productId,
    variantId,
    quantity = 1,
    unitPrice = 200,
    unitCost = 120,
    fulfillment = "ship",
  } = params;

  return repo.createPendingOrder({
    userId,
    tenantId,
    currency: "USD",
    subtotal: unitPrice * quantity,
    shipping: fulfillment === "ship" ? 9.95 : 0,
    total: unitPrice * quantity + (fulfillment === "ship" ? 9.95 : 0),
    fulfillment,
    idempotencyKey: `test-${productId}-${variantId}-${Date.now()}`,
    cartHash: "test-cart-hash",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    items: [
      {
        productId,
        variantId,
        quantity,
        unitPrice,
        unitCost,
        lineTotal: unitPrice * quantity,
      },
    ],
  });
}

export async function createPaidOrder(params: {
  userId?: string | null;
  tenantId: string;
  productId: string;
  variantId: string;
  quantity?: number;
  unitPrice?: number;
  unitCost?: number;
  fulfillment?: "ship" | "pickup";
  paymentIntentId?: string;
}) {
  const admin = createAdminClient();
  const repo = new OrdersRepository(admin);
  const order = await createPendingOrder(params);
  const paymentIntentId = params.paymentIntentId ?? `pi_test_${Date.now()}`;

  await repo.markPaidTransactionally(order.id, paymentIntentId, [
    {
      productId: params.productId,
      variantId: params.variantId,
      quantity: params.quantity ?? 1,
    },
  ]);

  const refreshed = await repo.getById(order.id);
  if (!refreshed) {
    throw new Error("Failed to load paid order");
  }
  return refreshed;
}
