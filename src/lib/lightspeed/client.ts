import type {
  LightspeedCreateProductPayload,
  LightspeedRemoteInventoryLevel,
  LightspeedListProductsResult,
  LightspeedListResponse,
  LightspeedProductResponse,
  LightspeedRemoteProduct,
  LightspeedUpdateProductPayload,
  LightspeedVariantAttribute,
  LightspeedVariantAttributeResponse,
} from "@/lib/lightspeed/types";

export class LightspeedClient {
  constructor(
    private readonly config: {
      domainPrefix: string;
      accessToken: string;
      apiVersion?: string;
    },
  ) {}

  private get baseUrl() {
    const apiVersion = this.config.apiVersion ?? "2026-04";
    return `https://${this.config.domainPrefix}.retail.lightspeed.app/api/${apiVersion}`;
  }

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Lightspeed request failed (${response.status})${body ? `: ${body}` : ""}`,
      );
    }

    return response;
  }

  async createProduct(payload: LightspeedCreateProductPayload) {
    const response = await this.request("/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return (await response.json()) as LightspeedProductResponse;
  }

  async updateProduct(productId: string, payload: LightspeedUpdateProductPayload) {
    const response = await this.request(`/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return (await response.json()) as LightspeedProductResponse;
  }

  async deleteProduct(productId: string) {
    await this.request(`/products/${productId}`, {
      method: "DELETE",
    });
  }

  async getProduct(productId: string) {
    const response = await this.request(`/products/${productId}`);
    const payload =
      (await response.json()) as LightspeedListResponse<LightspeedRemoteProduct>;
    const product = Array.isArray(payload.data)
      ? (payload.data[0] ?? null)
      : (payload.data ?? null);

    if (!product) {
      return null;
    }

    return this.hydrateProductInventory(product);
  }

  async listVariantAttributes() {
    const response = await this.request("/variant_attributes");
    const payload = (await response.json()) as LightspeedVariantAttributeResponse;

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    return payload.data ? [payload.data] : [];
  }

  async createVariantAttribute(name: string) {
    const response = await this.request("/variant_attributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = (await response.json()) as LightspeedVariantAttributeResponse;
    const attribute = Array.isArray(payload.data) ? payload.data[0] : payload.data;

    if (!attribute) {
      throw new Error("Lightspeed variant attribute response was empty.");
    }

    return attribute as LightspeedVariantAttribute;
  }

  async listProducts(input?: {
    after?: number | null;
    pageSize?: number;
    includeImages?: boolean;
  }): Promise<LightspeedListProductsResult> {
    const after = input?.after ?? null;
    const pageSize = input?.pageSize ?? 50;
    const includeImages = input?.includeImages ?? true;
    const params = new URLSearchParams();
    params.set("page_size", String(pageSize));
    if (typeof after === "number" && Number.isFinite(after) && after > 0) {
      params.set("after", String(after));
    }
    if (!includeImages) {
      params.set("include_images", "false");
    }

    const response = await this.request(`/products?${params.toString()}`);
    const payload =
      (await response.json()) as LightspeedListResponse<LightspeedRemoteProduct>;
    const products = Array.isArray(payload.data)
      ? payload.data
      : payload.data
        ? [payload.data]
        : [];

    const maxVersion = payload.version?.max ?? null;
    const totalProducts = payload.pagination?.total ?? payload.count ?? null;
    const nextAfter =
      typeof maxVersion === "number" && Number.isFinite(maxVersion) ? maxVersion : null;
    const hasNextPage = products.length > 0 && nextAfter !== null;

    return {
      products,
      after,
      pageSize,
      hasNextPage,
      nextAfter,
      totalProducts,
    };
  }

  private async listInventory(input: { productId: string; variants?: boolean }) {
    const params = new URLSearchParams();
    params.set("page_size", "5000");
    params.set("variants", input.variants ? "true" : "false");
    const response = await this.request(
      `/inventory/${input.productId}?${params.toString()}`,
    );
    const raw = await response.json();

    // X-Series returns a raw array; older API versions wrap in { data: [...] }
    if (Array.isArray(raw)) {
      return raw as LightspeedRemoteInventoryLevel[];
    }

    if (Array.isArray(raw?.data)) {
      return raw.data as LightspeedRemoteInventoryLevel[];
    }

    return raw?.data ? [raw.data as LightspeedRemoteInventoryLevel] : [];
  }

  private async hydrateProductInventory(product: LightspeedRemoteProduct) {
    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    const inventory = await this.listInventory({
      productId: product.id,
      variants: hasVariants,
    });

    if (inventory.length === 0) {
      return product;
    }

    if (!hasVariants) {
      return {
        ...product,
        inventory,
      };
    }

    const inventoryByProductId = new Map<string, LightspeedRemoteInventoryLevel[]>();
    for (const level of inventory) {
      const inventoryProductId = level.product_id?.trim();
      if (!inventoryProductId) {
        continue;
      }

      const existing = inventoryByProductId.get(inventoryProductId) ?? [];
      existing.push(level);
      inventoryByProductId.set(inventoryProductId, existing);
    }

    return {
      ...product,
      variants: product.variants!.map((variant) => ({
        ...variant,
        inventory: inventoryByProductId.get(variant.id) ?? variant.inventory ?? null,
      })),
    };
  }
}
