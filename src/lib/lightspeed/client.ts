import type {
  LightspeedCreateProductPayload,
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
    if (Array.isArray(payload.data)) {
      return payload.data[0] ?? null;
    }
    return payload.data ?? null;
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

  async listProducts(page = 1, pageSize = 50) {
    const response = await this.request(`/products?page=${page}&page_size=${pageSize}`);
    const payload =
      (await response.json()) as LightspeedListResponse<LightspeedRemoteProduct>;
    const products = Array.isArray(payload.data)
      ? payload.data
      : payload.data
        ? [payload.data]
        : [];

    const pagination = payload.pagination ?? null;
    const totalProducts =
      pagination?.total ??
      payload.count ??
      (products.length < pageSize ? (page - 1) * pageSize + products.length : null);
    const totalPages =
      pagination?.total_pages ??
      (typeof totalProducts === "number"
        ? Math.max(1, Math.ceil(totalProducts / pageSize))
        : null);
    const hasNextPage =
      typeof totalPages === "number"
        ? page < totalPages
        : typeof pagination?.next_page === "number"
          ? pagination.next_page > page
          : Boolean(pagination?.next) || products.length === pageSize;

    const hasPreviousPage =
      typeof pagination?.previous_page === "number"
        ? pagination.previous_page >= 1
        : Boolean(pagination?.previous) || page > 1;

    return {
      products,
      page,
      pageSize,
      hasNextPage,
      hasPreviousPage,
      totalProducts,
      totalPages,
    };
  }
}
