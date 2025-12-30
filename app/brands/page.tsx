import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StorefrontService } from "@/services/storefront-service";

function buildStoreHref(brand: string) {
  const params = new URLSearchParams();
  params.set("brand", brand);
  return `/store?${params.toString()}`;
}

export default async function BrandsPage() {
  const supabase = await createSupabaseServerClient();
  const service = new StorefrontService(supabase);
  const { brands } = await service.listFilters();
  const uniqueLabels = Array.from(
    new Set(brands.map((brand) => brand.label).filter(Boolean))
  );
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
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">All Brands</h1>
        <p className="text-zinc-400 text-sm mt-2">Tap a brand to view inventory.</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-zinc-400 mb-6">
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#brand-${letter}`}
            className="px-2 py-1 border border-zinc-800/70 hover:border-red-600/40 hover:text-white transition-colors"
          >
            {letter}
          </a>
        ))}
      </div>

      <div className="space-y-8">
        {letters.map((letter) => (
          <section key={letter} id={`brand-${letter}`} className="space-y-3">
            <h2 className="text-lg font-semibold text-white">{letter}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
              {grouped[letter].map((label) => (
                <Link
                  key={label}
                  href={buildStoreHref(label)}
                  className="text-sm text-zinc-300 hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
