// src/services/admin-service.ts

import type { ProductsRepo } from "@/repositories/products-repo";
import type { ProfilesRepo } from "@/repositories/profiles-repo";
import { z } from "zod";

const productCreateSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive(),
  shoe_sizes: z.array(z.number()).optional(),
  clothing_sizes: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
  condition: z.enum(["new", "used"]).default("new"),
  tenant_id: z.string().uuid().optional(),
  seller_id: z.string().uuid().optional(),
  marketplace_id: z.string().uuid().optional(),
});

const productUpdateSchema = productCreateSchema.partial();

export class AdminService {
  private products: ProductsRepo;
  private profiles: ProfilesRepo;
  private requestId?: string;
  private userId?: string | null;

  constructor(opts: {
    repos: {
      products: ProductsRepo;
      profiles: ProfilesRepo;
    };
    requestId?: string;
    userId?: string | null;
  }) {
    this.products = opts.repos.products;
    this.profiles = opts.repos.profiles;
    this.requestId = opts.requestId;
    this.userId = opts.userId;
  }

  private async assertAdmin() {
    if (!this.userId) throw new Error("Unauthorized");
    const isAdmin = await this.profiles.isAdmin(this.userId);
    if (!isAdmin) throw new Error("Forbidden: admin only");
  }

  async listProducts(page = 1, pageSize = 20) {
    await this.assertAdmin();
    return this.products.listPublic(page, pageSize);
  }

  async createProduct(input: z.infer<typeof productCreateSchema>) {
    await this.assertAdmin();

    const validated = productCreateSchema.parse(input);

    return this.products.adminCreate(validated);
  }

  async updateProduct(id: string, input: z.infer<typeof productUpdateSchema>) {
    await this.assertAdmin();

    const validated = productUpdateSchema.parse(input);
    return this.products.adminUpdate(id, validated);
  }

  async deleteProduct(id: string) {
    await this.assertAdmin();
    return this.products.adminDelete(id);
  }

  async getProfile(id: string) {
    await this.assertAdmin();
    return this.profiles.getById(id);
  }
}
