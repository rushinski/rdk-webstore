import type {
  LightspeedCreateProductPayload,
  LightspeedProductResponse,
  LightspeedUpdateProductPayload,
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

  async listProducts(pageSize = 100) {
    const response = await this.request(`/products?page_size=${pageSize}`);
    return response.json();
  }
}
