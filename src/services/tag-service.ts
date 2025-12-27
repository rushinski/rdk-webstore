// src/services/tag-service.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import type { Tables } from "@/types/database.types";
import type { SizeType } from "@/types/views/product";

type TagRow = Tables<"tags">;

export interface TagInputItem {
  label: string;
  group_key: string;
}

interface UpsertTagsInput {
  tags: TagInputItem[];
  tenantId?: string | null;
}

export async function upsertTags(
  supabase: TypedSupabaseClient,
  input: UpsertTagsInput
): Promise<TagRow[]> {
  const repo = new ProductRepository(supabase);
  const tags: TagRow[] = [];

  const normalized = input.tags
    .map((tag) => ({
      label: tag.label.trim(),
      group_key: tag.group_key,
    }))
    .filter((tag) => tag.label.length > 0);

  const unique = new Map<string, TagInputItem>();
  for (const tag of normalized) {
    unique.set(`${tag.group_key}:${tag.label}`, tag);
  }

  for (const tag of unique.values()) {
    const row = await repo.upsertTag({
      label: tag.label,
      group_key: tag.group_key,
      tenant_id: input.tenantId ?? null,
    });
    tags.push(row);
  }

  return tags;
}

export function buildSizeTags(
  variants: Array<{ size_type: SizeType; size_label: string; stock?: number | null }>
): TagInputItem[] {
  const tags: TagInputItem[] = [];
  const seen = new Set<string>();

  for (const variant of variants) {
    if (variant.stock !== undefined && variant.stock !== null && variant.stock <= 0) {
      continue;
    }

    const label = variant.size_label?.trim();
    if (!label) continue;

    let groupKey: string | null = null;
    if (variant.size_type === "shoe") groupKey = "size_shoe";
    if (variant.size_type === "clothing") groupKey = "size_clothing";
    if (variant.size_type === "custom") groupKey = "size_custom";
    if (!groupKey) continue;

    const key = `${groupKey}:${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push({ label, group_key: groupKey });
  }

  return tags;
}
