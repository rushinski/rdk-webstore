import { unstable_cache } from "next/cache";

import { createStorefrontService } from "@/modules/storefront/infrastructure/storefront-data";

const BRANDS_REVALIDATE_SECONDS = 300;

const listBrandLabelsCached = unstable_cache(
  async () => {
    const service = createStorefrontService();
    const { brands } = await service.listFilters();
    return Array.from(new Set(brands.map((brand) => brand.label).filter(Boolean)));
  },
  ["storefront", "brands"],
  { revalidate: BRANDS_REVALIDATE_SECONDS, tags: ["products:list"] },
);

export async function getBrandsPageData(query: string) {
  const qRaw = query.trim();
  const q = qRaw.toLowerCase();
  const uniqueLabels = sortLabels(await listBrandLabelsCached());
  const filtered = q
    ? uniqueLabels.filter((label) => label.toLowerCase().includes(q))
    : uniqueLabels;

  const grouped = filtered.reduce<Record<string, string[]>>((acc, label) => {
    const letter = normalizeLetter(label);
    (acc[letter] ??= []).push(label);
    return acc;
  }, {});

  const lettersWithResults = Object.keys(grouped).sort((a, b) => {
    if (a === "#") {
      return 1;
    }
    if (b === "#") {
      return -1;
    }
    return a.localeCompare(b);
  });

  return {
    filtered,
    grouped,
    lettersWithResults,
    qRaw,
    uniqueLabels,
  };
}

export function buildBrandStoreHref(brand: string) {
  const params = new URLSearchParams();
  params.set("brand", brand);
  return `/store?${params.toString()}`;
}

export const storefrontBrandLetters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "#"];
export const storefrontBrandPillLink =
  "inline-flex items-center border border-brand-border px-3 py-2 text-xs uppercase tracking-[0.08em] text-brand-text transition-colors hover:bg-brand-text hover:text-brand-surface";

function normalizeLetter(label: string) {
  const first = label?.trim()?.[0] ?? "";
  return /[a-z]/i.test(first) ? first.toUpperCase() : "#";
}

function sortLabels(labels: string[]) {
  return [...labels].sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower === "other") {
      return 1;
    }
    if (bLower === "other") {
      return -1;
    }
    return a.localeCompare(b);
  });
}
