import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { CatalogRepository } from "@/repositories/catalog-repo";
import { ProductRepository, type ProductFilters } from "@/repositories/product-repo";

export class StorefrontService {
  private productRepo: ProductRepository;
  private catalogRepo: CatalogRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.productRepo = new ProductRepository(supabase);
    this.catalogRepo = new CatalogRepository(supabase);
  }

  async listProducts(filters: ProductFilters) {
    return this.productRepo.list(filters);
  }

  async getProductById(id: string) {
    return this.productRepo.getById(id);
  }

  async listFilters() {
    const data = await this.productRepo.listFilterData();

    const brandMap = new Map<string, { label: string; isVerified: boolean }>();
    const modelsByBrand: Record<string, string[]> = {};
    const brandsByCategory: Record<string, string[]> = {};
    const modelSet = new Set<string>();
    const categorySet = new Set<string>();

    for (const product of data) {
      if (product.brand) {
        const existing = brandMap.get(product.brand);
        if (!existing) {
          brandMap.set(product.brand, {
            label: product.brand,
            isVerified: Boolean(product.brand_is_verified),
          });
        } else if (product.brand_is_verified) {
          existing.isVerified = true;
        }
      }

      if (product.category === "sneakers" && product.model && product.brand) {
        modelSet.add(product.model);
        if (!modelsByBrand[product.brand]) {
          modelsByBrand[product.brand] = [];
        }
        if (!modelsByBrand[product.brand].includes(product.model)) {
          modelsByBrand[product.brand].push(product.model);
        }
      }

      if (product.category) {
        categorySet.add(product.category);
        if (product.brand) {
          if (!brandsByCategory[product.category]) {
            brandsByCategory[product.category] = [];
          }
          if (!brandsByCategory[product.category].includes(product.brand)) {
            brandsByCategory[product.category].push(product.brand);
          }
        }
      }
    }

    const brands = Array.from(brandMap.values()).sort((a, b) => {
      if (a.isVerified !== b.isVerified) {
        return a.isVerified ? -1 : 1;
      }
      return a.label.localeCompare(b.label);
    });

    for (const brand of Object.keys(modelsByBrand)) {
      modelsByBrand[brand] = modelsByBrand[brand].sort((a, b) =>
        a.localeCompare(b)
      );
    }

    for (const category of Object.keys(brandsByCategory)) {
      brandsByCategory[category] = brandsByCategory[category].sort((a, b) =>
        a.localeCompare(b)
      );
    }

    const models = Array.from(modelSet).sort((a, b) => a.localeCompare(b));
    const categories = Array.from(categorySet).sort((a, b) =>
      a.localeCompare(b)
    );

    return { brands, models, modelsByBrand, brandsByCategory, categories };
  }

  async listBrandGroupsByKeys(keys: Set<string>) {
    const groups = await this.catalogRepo.listBrandGroups(null, false);
    return groups.filter((group) => keys.has(group.key));
  }

  async listBrandsByGroupKey(groupKey: string | null) {
    const brands = await this.catalogRepo.listBrandsWithGroups(null, false);
    const filtered = groupKey
      ? brands.filter((brand) => brand.group?.key === groupKey)
      : brands;

    return filtered
      .map((brand) => brand.canonical_label)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }
}
