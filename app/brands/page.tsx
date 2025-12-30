import Link from "next/link";
import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { StorefrontService } from "@/services/storefront-service";

const BRANDS_REVALIDATE_SECONDS = 300;
export const revalidate = BRANDS_REVALIDATE_SECONDS;

const listBrandLabelsCached = unstable_cache(
  async () => {
    const supabase = createSupabasePublicClient();
    const service = new StorefrontService(supabase);
    const { brands } = await service.listFilters();
    return Array.from(new Set(brands.map((brand) => brand.label).filter(Boolean)));
  },
  ["storefront", "brands"],
  { revalidate: BRANDS_REVALIDATE_SECONDS, tags: ["products:list"] }
);

function buildStoreHref(brand: string) {
  const params = new URLSearchParams();
  params.set("brand", brand);
  return `/store?${params.toString()}`;
}

export default async function BrandsPage() {
  const uniqueLabels = await listBrandLabelsCached();
  uniqueLabels.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower === "other") return 1;
    if (bLower === "other") return -1;
    return a.localeCompare(b);
  });

  const grouped = uniqueLabels.reduce<Record<string, string[]>>((acc, label) => {
    const letter = /[a-z]/i.test(label[0]) ? label[0].toUpperCase() : "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(label);
    return acc;
  }, {});
  const letters = Object.keys(grouped).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="relative overflow-hidden">
      <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-red-600/20 blur-3xl" />
      <div className="absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Brand Index</p>
            <h1 className="text-4xl font-bold text-white mt-3">All Brands</h1>
            <p className="text-zinc-400 text-sm mt-3">
              Browse by letter or jump straight to a favorite.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
            <span className="px-3 py-2 border border-zinc-800/70 bg-zinc-950/60">
              {uniqueLabels.length} brands
            </span>
            <span className="px-3 py-2 border border-zinc-800/70 bg-zinc-950/60">A-Z index</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 text-xs text-zinc-400">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#brand-${letter}`}
              className="px-3 py-1 rounded-full border border-zinc-800/70 hover:border-red-600/40 hover:text-white transition-colors"
            >
              {letter}
            </a>
          ))}
        </div>

        <div className="mt-10 grid gap-6">
          {letters.map((letter) => (
            <section
              key={letter}
              id={`brand-${letter}`}
              className="rounded-2xl border border-zinc-800/70 bg-gradient-to-br from-zinc-950/80 to-zinc-900/40 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full border border-zinc-700/70 bg-zinc-950 text-white flex items-center justify-center text-lg font-semibold">
                    {letter}
                  </div>
                  <h2 className="text-lg font-semibold text-white">{letter} Brands</h2>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {grouped[letter].length} total
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {grouped[letter].map((label) => (
                  <Link
                    key={label}
                    href={buildStoreHref(label)}
                    className="rounded-full border border-zinc-800/70 bg-zinc-950/70 px-3 py-1 text-sm text-zinc-300 hover:text-white hover:border-red-600/40 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
