import { BrandShowcaseCarousel } from "./BrandShowcaseCarousel";

const defaultProducts = [
  {
    id: "showcase-1",
    brand: "BRAND NAME",
    title: "EDITORIAL PRODUCT ONE",
    price: "$240.00",
  },
  {
    id: "showcase-2",
    brand: "BRAND NAME",
    title: "EDITORIAL PRODUCT TWO",
    price: "$180.00",
  },
  {
    id: "showcase-3",
    brand: "BRAND NAME",
    title: "EDITORIAL PRODUCT THREE",
    price: "$320.00",
  },
  {
    id: "showcase-4",
    brand: "BRAND NAME",
    title: "EDITORIAL PRODUCT FOUR",
    price: "$210.00",
  },
];

export function BrandShowcaseSection({ heading }: { heading: string }) {
  return (
    <section className="bg-brand-page py-16">
      <div className="h-[60vh] w-full bg-neutral-500">
        {/* TODO: Replace with brand lifestyle photo */}
      </div>
      <BrandShowcaseCarousel heading={heading} products={defaultProducts} />
    </section>
  );
}
