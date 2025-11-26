// src/services/catalog-service.ts

import type { ProductsRepo } from "@/repositories/products-repo";

export class CatalogService {
  private products: ProductsRepo;
  private requestId?: string;
  private userId?: string | null;

  constructor(opts: {
    repos: {
      products: ProductsRepo;
    };
    requestId?: string;
    userId?: string | null;
  }) {
    this.products = opts.repos.products;
    this.requestId = opts.requestId;
    this.userId = opts.userId;
  }

  async getProduct(id: string) {
    return this.products.getById(id);
  }

  async listProducts(page = 1, pageSize = 20) {
    return this.products.listPublic(page, pageSize);
  }

  async searchProducts(params: {
    brand?: string;
    q?: string;
    shoeSize?: number;
    clothingSize?: string;
  }) {
    return this.products.search(params);
  }
}
