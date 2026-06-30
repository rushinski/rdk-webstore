import Link from "next/link";
import { unstable_cache } from "next/cache";

import { inputStyles } from "@/components/ui/inputStyles";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { StorefrontService } from "@/services/storefront-service";

const BRANDS_REVALIDATE_SECONDS = 300;
export const revalidate = 300;

const listBrandLabelsCached = unstable_cache(
  async () => {
    const supabase = createSupabasePublicClient();
    const service = new StorefrontService(supabase);
    const { brands } = await service.listFilters();
    return Array.from(new Set(brands.map((b) => b.label).filter(Boolean)));
  },
  ["storefront", "brands"],
  { revalidate: BRANDS_REVALIDATE_SECONDS, tags: ["products:list"] },
);

function buildStoreHref(brand: string) {
  const params = new URLSearchParams();
  params.set("brand", brand);
  return `/store?${params.toString()}`;
}

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

const allLetters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "#"];
const pillLink =
  "inline-flex items-center border border-brand-border px-3 py-2 text-xs uppercase tracking-[0.08em] text-brand-text transition-colors hover:bg-brand-text hover:text-brand-surface";

export default async function BrandsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const qRaw = (sp.q ?? "").trim();
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

  return (
    <div className="min-h-screen bg-brand-page">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <nav className="mb-5 text-sm text-brand-muted">
          <Link href="/" className="transition-colors hover:text-brand-text">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-brand-text">Brands</span>
        </nav>

        <div className="overflow-hidden border border-brand-border bg-brand-surface">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border px-5 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-brand-muted">
                Brand Index
              </p>
              <h1 className="mt-3 text-4xl font-bold text-brand-text">All Brands</h1>
              <p className="mt-3 text-sm text-brand-muted">
                Browse by letter or search for a favorite.
              </p>
            </div>

            <form action="/brands" method="get" className="w-full sm:w-auto">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-[360px]">
                  <input
                    name="q"
                    defaultValue={qRaw}
                    placeholder="Search brands..."
                    className={`${inputStyles} pr-10`}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted"
                  >
                    ⌕
                  </span>
                </div>

                <button type="submit" className={pillLink}>
                  Search
                </button>

                {qRaw ? (
                  <Link href="/brands" className={pillLink}>
                    Clear
                  </Link>
                ) : null}
              </div>

              <div className="mt-2 text-xs text-brand-muted">
                Showing{" "}
                <span className="font-medium text-brand-text">{filtered.length}</span> of{" "}
                <span className="font-medium text-brand-text">{uniqueLabels.length}</span>{" "}
                brands
              </div>
            </form>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-brand-muted">Go To:</span>
              <div className="flex flex-wrap gap-1">
                {allLetters.map((letter) => {
                  const has = Boolean(grouped[letter]?.length);
                  return has ? (
                    <a
                      key={letter}
                      href={`#brand-${letter}`}
                      className="flex h-8 w-8 items-center justify-center border border-brand-border text-xs text-brand-text transition-colors hover:bg-brand-text hover:text-brand-surface"
                    >
                      {letter}
                    </a>
                  ) : (
                    <span
                      key={letter}
                      aria-disabled="true"
                      className="flex h-8 w-8 cursor-not-allowed items-center justify-center border border-brand-border text-xs text-brand-muted"
                    >
                      {letter}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-brand-muted">
              {lettersWithResults.length ? (
                <span>
                  Sections:{" "}
                  <span className="font-medium text-brand-text">
                    {lettersWithResults.length}
                  </span>
                </span>
              ) : (
                <span>No results</span>
              )}
            </div>
          </div>

          <div className="divide-y divide-brand-border">
            {lettersWithResults.length === 0 ? (
              <div className="px-5 py-10">
                <div className="font-semibold text-brand-text">No brands found.</div>
                <div className="mt-1 text-sm text-brand-muted">
                  Try a different search term.
                </div>
              </div>
            ) : (
              lettersWithResults.map((letter) => (
                <section key={letter} id={`brand-${letter}`} className="scroll-mt-24">
                  <div className="flex items-center justify-between border-b border-brand-border bg-brand-page px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center border border-brand-border text-lg font-semibold text-brand-text">
                        {letter}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-brand-text">
                          {letter === "#" ? "Other" : "Brands"}
                        </h2>
                        <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-brand-muted">
                          Section {letter}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs uppercase tracking-[0.2em] text-brand-muted">
                      {grouped[letter].length} total
                    </span>
                  </div>

                  <div className="px-5 py-5">
                    <ul className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                      {grouped[letter].map((label) => (
                        <li key={label} className="min-w-0">
                          <Link
                            href={buildStoreHref(label)}
                            className={pillLink}
                            title={`Shop ${label}`}
                          >
                            {label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
