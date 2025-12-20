// src/services/tag-service.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import type { Tables } from "@/types/database.types";
import type { Category, Condition, SizeType } from "@/types/views/product";

type TagRow = Tables<"tags">;

interface TagGenerationInput {
  brand: string;
  category: Category;
  condition: Condition;
  variants: Array<{ size_type: SizeType; size_label: string }>;
  custom_tags?: string[];
}

export async function generateTags(
  supabase: TypedSupabaseClient,
  input: TagGenerationInput & { tenantId?: string | null }
): Promise<TagRow[]> {
  const repo = new ProductRepository(supabase);
  const tags: TagRow[] = [];

  // Brand tag
  const brandTag = await repo.upsertTag({
    label: input.brand,
    group_key: 'brand',
    tenant_id: input.tenantId ?? null,
  });
  tags.push(brandTag);

  // Category tag
  const categoryTag = await repo.upsertTag({
    label: input.category,
    group_key: 'category',
    tenant_id: input.tenantId ?? null,
  });
  tags.push(categoryTag);

  // Condition tag
  const conditionTag = await repo.upsertTag({
    label: input.condition,
    group_key: 'condition',
    tenant_id: input.tenantId ?? null,
  });
  tags.push(conditionTag);

  // Size tags
  const sizeTypes = new Set(input.variants.map(v => v.size_type));
  
  for (const sizeType of sizeTypes) {
    if (sizeType === 'shoe') {
      const shoeSizes = input.variants.filter(v => v.size_type === 'shoe').map(v => v.size_label);
      for (const size of shoeSizes) {
        const tag = await repo.upsertTag({
          label: size,
          group_key: 'size_shoe',
          tenant_id: input.tenantId ?? null,
        });
        tags.push(tag);
      }
    } else if (sizeType === 'clothing') {
      const clothingSizes = input.variants.filter(v => v.size_type === 'clothing').map(v => v.size_label);
      for (const size of clothingSizes) {
        const tag = await repo.upsertTag({
          label: size,
          group_key: 'size_clothing',
          tenant_id: input.tenantId ?? null,
        });
        tags.push(tag);
      }
    } else if (sizeType === 'custom') {
      const customSizes = input.variants.filter(v => v.size_type === 'custom').map(v => v.size_label);
      for (const size of customSizes) {
        const tag = await repo.upsertTag({
          label: size,
          group_key: 'size_custom',
          tenant_id: input.tenantId ?? null,
        });
        tags.push(tag);
      }
    } else if (sizeType === 'none') {
      const tag = await repo.upsertTag({
        label: 'None',
        group_key: 'size_none',
        tenant_id: input.tenantId ?? null,
      });
      tags.push(tag);
    }
  }

  // Custom tags
  if (input.custom_tags) {
    for (const customTag of input.custom_tags) {
      // Determine appropriate group_key or default to category
      const tag = await repo.upsertTag({
        label: customTag,
        group_key: 'category', // Default group
        tenant_id: input.tenantId ?? null,
      });
      tags.push(tag);
    }
  }

  return tags;
}