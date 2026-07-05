import { BrandShowcaseSection } from "@/components/storefront/home/BrandShowcaseSection";
import { HomeHero } from "@/components/storefront/home/HomeHero";
import { storefrontHomeShowcaseSections } from "@/modules/storefront/application/storefront-home";

export function HomePageContent() {
  return (
    <div className="bg-brand-page">
      <HomeHero />
      {storefrontHomeShowcaseSections.map((section) => (
        <BrandShowcaseSection key={section.key} heading={section.heading} />
      ))}
    </div>
  );
}
