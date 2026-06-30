import Link from "next/link";

import { buttonStyles } from "@/components/ui/buttonStyles";

type ShowcaseProduct = {
  id: string;
  brand: string;
  title: string;
  price: string;
};

export function BrandShowcaseCarousel({
  heading,
  products,
}: {
  heading: string;
  products: ShowcaseProduct[];
}) {
  return (
    <div className="bg-brand-page px-6 py-12 md:px-12 lg:px-16">
      <h2 className="text-center text-2xl font-black uppercase tracking-[0.2em] text-brand-text">
        {heading}
      </h2>
      <div className="mt-6 flex items-center justify-center gap-8 text-xs uppercase tracking-[0.08em]">
        <button
          type="button"
          className="border-b-2 border-brand-text pb-2 font-bold text-brand-text"
        >
          All
        </button>
        <button type="button" className="pb-2 text-brand-muted">
          T-Shirts
        </button>
        <button type="button" className="pb-2 text-brand-muted">
          Shorts
        </button>
        <button type="button" className="pb-2 text-brand-muted">
          Hoodies
        </button>
      </div>
      <div className="mt-8 overflow-x-auto">
        <div className="flex min-w-max gap-4 md:gap-6">
          {products.map((product) => (
            <Link key={product.id} href="/store" className="w-64 flex-shrink-0">
              <div className="flex h-64 items-center justify-center bg-neutral-300">
                {/* TODO: Replace product image placeholder */}
                <span className="text-xs uppercase tracking-[0.08em] text-brand-muted">
                  Product Image
                </span>
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.06em] text-brand-muted">
                {product.brand}
              </div>
              <div className="mt-1 text-sm uppercase text-brand-text">
                {product.title}
              </div>
              <div className="mt-1 text-sm font-medium text-brand-text">
                {product.price}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-10 text-center">
        <Link href="/store" className={buttonStyles.primary}>
          SHOP {heading}
        </Link>
      </div>
    </div>
  );
}
