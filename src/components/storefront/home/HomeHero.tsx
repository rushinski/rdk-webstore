import Link from "next/link";

import { buttonStyles } from "@/components/ui/buttonStyles";

export function HomeHero() {
  return (
    <section className="bg-brand-page">
      <div className="relative h-[60vh] w-full bg-neutral-700 md:h-[85vh]">
        {/* TODO: Replace bg-neutral-700 with next/image using hero background photo */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
        <div className="absolute inset-x-0 top-[55%] -translate-y-1/2 px-4 text-center text-white">
          {/* TODO: Replace with final hero headline copy */}
          <h1 className="text-3xl font-black uppercase tracking-[0.16em] md:text-6xl">
            ELEVATED CURATION OF FOOTWEAR
            <br />
            &amp; STYLE
          </h1>
          <div className="mt-4 inline-flex rounded-full bg-brand-text px-4 py-1.5 text-xs font-bold tracking-wide text-white">
            {/* TODO: Replace shipping badge copy */}⚡ Ships Same or Next Business Day
          </div>
          <div className="mt-6">
            <Link href="/store" className={buttonStyles.primary}>
              SHOP NOW
            </Link>
          </div>
          <div className="mt-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-xs text-gray-700 backdrop-blur-sm">
            {/* TODO: Replace rating copy */}
            <span className="mr-2 text-[#00A650]">★★★★★</span>
            Rated 4.9/5 by 500+ Reviews
          </div>
        </div>
      </div>
    </section>
  );
}
