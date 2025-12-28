// app/api/store/filters/route.ts

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .select("brand, model, brand_is_verified, model_is_verified, category")
      .eq("is_active", true)
      .limit(2000);

    if (error) throw error;

    const brandMap = new Map<string, { label: string; isVerified: boolean }>();
    const modelsByBrand: Record<string, string[]> = {};
    const brandsByCategory: Record<string, string[]> = {};
    const modelSet = new Set<string>();
    const categorySet = new Set<string>();

    for (const product of data ?? []) {
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

      if (product.category === "sneakers" && product.model) {
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

    const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ brands, models, modelsByBrand, brandsByCategory, categories });
  } catch (error) {
    console.error("Store filters API error:", error);
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 });
  }
}
