import { BrandShowcaseSection } from "@/components/storefront/home/BrandShowcaseSection";
import { HomeHero } from "@/components/storefront/home/HomeHero";

const showcaseSections = [
  { key: "brand-1", heading: "BRAND NAME" },
  { key: "brand-2", heading: "BRAND NAME" },
  { key: "brand-3", heading: "BRAND NAME" },
];

export default function HomePage() {
  return (
    <div className="bg-brand-page">
      <HomeHero />
      {showcaseSections.map((section) => (
        <BrandShowcaseSection key={section.key} heading={section.heading} />
      ))}
    </div>
  );
}
