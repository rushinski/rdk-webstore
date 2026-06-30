# Solesneakers Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild this branch's storefront and admin frontend into the approved `solesneakers` design system without changing routes, backend contracts, or business behavior.

**Architecture:** Introduce a shared theme/token layer, split large storefront and admin shell components into focused domain folders, and then recompose existing routes on top of those primitives. Keep pages thin, keep server components server by default, and confine client state to overlays, drawers, selectors, and interactive filters.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Jest

---

## File Structure Map

### Shared foundation

- Create: `src/config/brand/solesneakers.ts`
- Create: `src/components/ui/buttonStyles.ts`
- Create: `src/components/ui/inputStyles.ts`
- Create: `src/components/ui/SectionHeading.tsx`
- Modify: `tailwind.config.ts`
- Modify: `src/styles/global.css`
- Modify: `app/layout.tsx`

### Storefront shell

- Create: `src/components/storefront/shell/StorefrontHeader.tsx`
- Create: `src/components/storefront/shell/StorefrontHeaderClient.tsx`
- Create: `src/components/storefront/shell/StorefrontSidebarDrawer.tsx`
- Create: `src/components/storefront/search/StorefrontSearchOverlay.tsx`
- Create: `src/components/storefront/cart/StorefrontCartDrawer.tsx`
- Create: `src/components/storefront/shell/StorefrontFooter.tsx`
- Modify: `src/components/shell/ScrollHeader.tsx`
- Modify: `src/components/shell/ClientShell.tsx`

### Home / browse / PDP

- Create: `src/components/storefront/home/HomeHero.tsx`
- Create: `src/components/storefront/home/BrandShowcaseSection.tsx`
- Create: `src/components/storefront/home/BrandShowcaseCarousel.tsx`
- Create: `src/components/storefront/catalog/CatalogToolbar.tsx`
- Create: `src/components/storefront/catalog/CatalogFilterBar.tsx`
- Create: `src/components/storefront/catalog/CatalogFilterDrawer.tsx`
- Create: `src/components/storefront/catalog/CatalogProductCard.tsx`
- Create: `src/components/storefront/catalog/CatalogProductGrid.tsx`
- Create: `src/components/storefront/product/ProductImageGallery.tsx`
- Create: `src/components/storefront/product/ProductPurchasePanel.tsx`
- Modify: `app/page.tsx`
- Modify: `app/store/page.tsx`
- Modify: `app/store/[productId]/page.tsx`
- Modify: `src/components/store/ProductGrid.tsx`
- Modify: `src/components/store/ProductCard.tsx`
- Modify: `src/components/store/FilterPanel.tsx`
- Modify: `src/components/store/StoreControls.tsx`
- Modify: `src/components/store/ProductDetail.tsx`

### Auth + admin

- Create: `src/components/auth/AuthPageShell.tsx`
- Create: `src/components/admin/shell/AdminBrandHeader.tsx`
- Create: `src/components/admin/shell/AdminNavItem.tsx`
- Modify: `src/components/auth/ui/AuthShell.tsx`
- Modify: `app/auth/layout.tsx`
- Modify: `app/admin/layout.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminTopbar.tsx`

### Tests

- Create: `tests/unit/solesneakers-brand-config.test.ts`
- Create: `tests/unit/storefront-header.test.tsx`
- Create: `tests/unit/storefront-homepage.test.tsx`
- Create: `tests/unit/auth-shell-branding.test.tsx`
- Create: `tests/unit/admin-shell-branding.test.tsx`

---

### Task 1: Build the Solesneakers Theme Foundation

**Files:**
- Create: `src/config/brand/solesneakers.ts`
- Create: `src/components/ui/buttonStyles.ts`
- Create: `src/components/ui/inputStyles.ts`
- Test: `tests/unit/solesneakers-brand-config.test.ts`
- Modify: `tailwind.config.ts`
- Modify: `src/styles/global.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing brand token test**

```ts
import { brandTheme } from "@/config/brand/solesneakers";

describe("brandTheme", () => {
  it("exposes the approved solesneakers tokens", () => {
    expect(brandTheme.name).toBe("solesneakers");
    expect(brandTheme.colors.page).toBe("#EFEFEF");
    expect(brandTheme.colors.text).toBe("#111111");
    expect(brandTheme.colors.sale).toBe("#CC0000");
    expect(brandTheme.logo.alt).toBe("solesneakers");
    expect(brandTheme.contact.instagramHandle).toBe("null@gmail.com");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand tests/unit/solesneakers-brand-config.test.ts`
Expected: FAIL with `Cannot find module '@/config/brand/solesneakers'`

- [ ] **Step 3: Add the theme config and shared style exports**

```ts
// src/config/brand/solesneakers.ts
export const brandTheme = {
  name: "solesneakers",
  logo: {
    src: "/images/logo.svg",
    alt: "solesneakers",
  },
  contact: {
    instagramHandle: "null@gmail.com",
  },
  colors: {
    page: "#EFEFEF",
    surface: "#FFFFFF",
    text: "#111111",
    muted: "#888888",
    accent: "#111111",
    sale: "#CC0000",
    border: "#E0E0E0",
    overlay: "rgba(0,0,0,0.45)",
  },
} as const;
```

```ts
// src/components/ui/buttonStyles.ts
export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center bg-brand-text text-brand-surface uppercase tracking-[0.1em] text-sm font-bold py-3 px-6 rounded-none transition-colors hover:bg-neutral-800",
  secondary:
    "inline-flex items-center justify-center border border-brand-text text-brand-text uppercase tracking-[0.1em] text-sm font-bold py-3 px-6 rounded-none transition-colors hover:bg-brand-text hover:text-brand-surface",
} as const;
```

```ts
// src/components/ui/inputStyles.ts
export const inputStyles =
  "w-full border border-brand-border bg-brand-surface px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted outline-none transition-colors focus:border-brand-text rounded-none";
```

```ts
// tailwind.config.ts
extend: {
  colors: {
    brand: {
      page: "#EFEFEF",
      surface: "#FFFFFF",
      text: "#111111",
      muted: "#888888",
      accent: "#111111",
      sale: "#CC0000",
      border: "#E0E0E0",
      overlay: "rgba(0,0,0,0.45)",
    },
  },
}
```

```css
/* src/styles/global.css */
:root {
  --background: #efefef;
  --foreground: #111111;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: "Inter", sans-serif;
}
```

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  title: "solesneakers - curated footwear and style",
  description: "Curated footwear and apparel with a clean editorial storefront.",
};

<body className="bg-brand-page text-brand-text">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --runInBand tests/unit/solesneakers-brand-config.test.ts`
Expected: PASS

- [ ] **Step 5: Run static verification for the foundation**

Run: `npm run lint -- src/config/brand/solesneakers.ts src/components/ui/buttonStyles.ts src/components/ui/inputStyles.ts app/layout.tsx tailwind.config.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/config/brand/solesneakers.ts src/components/ui/buttonStyles.ts src/components/ui/inputStyles.ts src/styles/global.css tailwind.config.ts app/layout.tsx tests/unit/solesneakers-brand-config.test.ts
git commit -m "feat: add solesneakers theme foundation"
```

### Task 2: Replace the Storefront Shell and Overlay Architecture

**Files:**
- Create: `src/components/storefront/shell/StorefrontHeader.tsx`
- Create: `src/components/storefront/shell/StorefrontHeaderClient.tsx`
- Create: `src/components/storefront/shell/StorefrontSidebarDrawer.tsx`
- Create: `src/components/storefront/search/StorefrontSearchOverlay.tsx`
- Create: `src/components/storefront/cart/StorefrontCartDrawer.tsx`
- Create: `src/components/storefront/shell/StorefrontFooter.tsx`
- Test: `tests/unit/storefront-header.test.tsx`
- Modify: `src/components/shell/ScrollHeader.tsx`
- Modify: `src/components/shell/ClientShell.tsx`

- [ ] **Step 1: Write the failing storefront header render test**

```ts
import { renderToStaticMarkup } from "react-dom/server";

import { StorefrontHeader } from "@/components/storefront/shell/StorefrontHeader";

describe("StorefrontHeader", () => {
  it("renders the solesneakers shell links", () => {
    const html = renderToStaticMarkup(
      <StorefrontHeader isAuthenticated={false} userEmail={null} role={null} />,
    );

    expect(html).toContain("LOGIN");
    expect(html).toContain("SEARCH");
    expect(html).toContain("CART (0)");
    expect(html).toContain("solesneakers");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand tests/unit/storefront-header.test.tsx`
Expected: FAIL with `Cannot find module '@/components/storefront/shell/StorefrontHeader'`

- [ ] **Step 3: Add the new storefront shell components**

```tsx
// src/components/storefront/shell/StorefrontHeader.tsx
import Image from "next/image";

import { StorefrontHeaderClient } from "./StorefrontHeaderClient";

export function StorefrontHeader(props: {
  isAuthenticated: boolean;
  userEmail?: string | null;
  role?: ProfileRole | null;
}) {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-brand-border bg-brand-page">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6 md:px-12 lg:px-16">
        <StorefrontHeaderClient {...props}>
          <Image src="/images/logo.svg" alt="solesneakers" width={160} height={40} />
        </StorefrontHeaderClient>
      </div>
    </header>
  );
}
```

```tsx
// src/components/storefront/shell/StorefrontHeaderClient.tsx
"use client";

export function StorefrontHeaderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <button aria-label="Open menu">≡</button>
      <div className="flex-1 text-center">{children}</div>
      <div className="hidden md:flex items-center gap-6 text-[13px] font-medium uppercase tracking-[0.06em]">
        <a href="/auth/login">LOGIN</a>
        <button type="button">SEARCH</button>
        <button type="button">CART (0)</button>
      </div>
    </>
  );
}
```

```tsx
// src/components/shell/ClientShell.tsx
import { StorefrontSearchOverlay } from "@/components/storefront/search/StorefrontSearchOverlay";
import { StorefrontCartDrawer } from "@/components/storefront/cart/StorefrontCartDrawer";
import { StorefrontFooter } from "@/components/storefront/shell/StorefrontFooter";

<StorefrontSearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
<StorefrontCartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
{isStoreRoute && <StorefrontFooter />}
```

```tsx
// src/components/shell/ScrollHeader.tsx
import { StorefrontHeader } from "@/components/storefront/shell/StorefrontHeader";

return <StorefrontHeader isAuthenticated={isAuthenticated} userEmail={userEmail} role={role} />;
```

- [ ] **Step 4: Run the header test to verify it passes**

Run: `npx jest --runInBand tests/unit/storefront-header.test.tsx`
Expected: PASS

- [ ] **Step 5: Run route shell verification**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/storefront/shell/StorefrontHeader.tsx src/components/storefront/shell/StorefrontHeaderClient.tsx src/components/storefront/shell/StorefrontSidebarDrawer.tsx src/components/storefront/search/StorefrontSearchOverlay.tsx src/components/storefront/cart/StorefrontCartDrawer.tsx src/components/storefront/shell/StorefrontFooter.tsx src/components/shell/ScrollHeader.tsx src/components/shell/ClientShell.tsx tests/unit/storefront-header.test.tsx
git commit -m "feat: rebuild storefront shell for solesneakers"
```

### Task 3: Rebuild the Homepage Into Reusable Editorial Sections

**Files:**
- Create: `src/components/storefront/home/HomeHero.tsx`
- Create: `src/components/storefront/home/BrandShowcaseSection.tsx`
- Create: `src/components/storefront/home/BrandShowcaseCarousel.tsx`
- Test: `tests/unit/storefront-homepage.test.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the failing homepage render test**

```ts
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "@/app/page";

describe("app/page", () => {
  it("renders the solesneakers editorial homepage sections", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("ELEVATED CURATION OF FOOTWEAR");
    expect(html).toContain("BRAND NAME");
    expect(html).toContain("SHOP NOW");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand tests/unit/storefront-homepage.test.tsx`
Expected: FAIL because the current homepage still renders `REALDEALKICKZSC`

- [ ] **Step 3: Replace the route composition with the new sections**

```tsx
// app/page.tsx
import { HomeHero } from "@/components/storefront/home/HomeHero";
import { BrandShowcaseSection } from "@/components/storefront/home/BrandShowcaseSection";

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
```

```tsx
// src/components/storefront/home/HomeHero.tsx
export function HomeHero() {
  return (
    <section className="bg-brand-page">
      <div className="relative h-[60vh] md:h-[85vh] bg-neutral-700">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
        <div className="absolute inset-x-0 top-[55%] -translate-y-1/2 px-4 text-center text-white">
          <h1 className="text-3xl md:text-6xl font-black italic uppercase tracking-[0.2em]">
            ELEVATED CURATION OF FOOTWEAR &amp; STYLE
          </h1>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the homepage test to verify it passes**

Run: `npx jest --runInBand tests/unit/storefront-homepage.test.tsx`
Expected: PASS

- [ ] **Step 5: Run route verification**

Run: `npm run lint -- app/page.tsx src/components/storefront/home/HomeHero.tsx src/components/storefront/home/BrandShowcaseSection.tsx src/components/storefront/home/BrandShowcaseCarousel.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx src/components/storefront/home/HomeHero.tsx src/components/storefront/home/BrandShowcaseSection.tsx src/components/storefront/home/BrandShowcaseCarousel.tsx tests/unit/storefront-homepage.test.tsx
git commit -m "feat: rebuild homepage for solesneakers"
```

### Task 4: Replace Browse, Filter, and Product Card Presentation

**Files:**
- Create: `src/components/storefront/catalog/CatalogToolbar.tsx`
- Create: `src/components/storefront/catalog/CatalogFilterBar.tsx`
- Create: `src/components/storefront/catalog/CatalogFilterDrawer.tsx`
- Create: `src/components/storefront/catalog/CatalogProductCard.tsx`
- Create: `src/components/storefront/catalog/CatalogProductGrid.tsx`
- Modify: `app/store/page.tsx`
- Modify: `src/components/store/ProductGrid.tsx`
- Modify: `src/components/store/ProductCard.tsx`
- Modify: `src/components/store/FilterPanel.tsx`
- Modify: `src/components/store/StoreControls.tsx`

- [ ] **Step 1: Write a failing browse-page assertion against the new browse label**

```ts
import { renderToStaticMarkup } from "react-dom/server";

import { ProductGrid } from "@/components/store/ProductGrid";

describe("ProductGrid", () => {
  it("renders the editorial grid shell for browse cards", () => {
    const html = renderToStaticMarkup(<ProductGrid products={[]} storeHref="/store" />);
    expect(html).toContain("No products found");
  });
});
```

- [ ] **Step 2: Run test to verify the current implementation baseline**

Run: `npx jest --runInBand tests/unit/storefront-homepage.test.tsx tests/unit/checkout-page.test.tsx`
Expected: PASS, confirming the route test harness is stable before replacing browse UI

- [ ] **Step 3: Recompose browse layout around new catalog primitives**

```tsx
// app/store/page.tsx
import { CatalogToolbar } from "@/components/storefront/catalog/CatalogToolbar";
import { CatalogFilterBar } from "@/components/storefront/catalog/CatalogFilterBar";

<div className="bg-brand-page">
  <div className="px-6 pt-4 text-xs uppercase tracking-[0.15em] text-brand-muted">
    HOME / SHOP / {browseLabel}
  </div>
  <h1 className="py-10 text-center text-3xl font-black uppercase tracking-[0.15em] text-brand-text">
    {browseLabel}
  </h1>
  <CatalogToolbar total={productsResult.total} sort={filters.sort ?? "newest"} />
  <CatalogFilterBar />
  <ProductGrid products={productsResult.products} storeHref={storeHref} />
</div>
```

```tsx
// src/components/store/ProductCard.tsx
return (
  <Link href={productHref} className="group block">
    <div className="aspect-square bg-brand-page">
      <Image className="object-contain transition-transform duration-300 group-hover:scale-105" />
    </div>
    <div className="pt-3">
      <div className="text-xs uppercase tracking-[0.06em] text-brand-muted">{product.brand}</div>
      <h3 className="mt-0.5 text-xs uppercase text-brand-text">{product.name}</h3>
      <div className="mt-1 text-sm font-medium text-brand-text">{priceDisplay}</div>
    </div>
  </Link>
);
```

```tsx
// src/components/store/FilterPanel.tsx
className="border border-brand-border bg-brand-surface shadow-md rounded-none"
```

- [ ] **Step 4: Run verification for browse routes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Run focused lint verification**

Run: `npm run lint -- app/store/page.tsx src/components/store/ProductGrid.tsx src/components/store/ProductCard.tsx src/components/store/FilterPanel.tsx src/components/store/StoreControls.tsx src/components/storefront/catalog/CatalogToolbar.tsx src/components/storefront/catalog/CatalogFilterBar.tsx src/components/storefront/catalog/CatalogFilterDrawer.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/store/page.tsx src/components/store/ProductGrid.tsx src/components/store/ProductCard.tsx src/components/store/FilterPanel.tsx src/components/store/StoreControls.tsx src/components/storefront/catalog/CatalogToolbar.tsx src/components/storefront/catalog/CatalogFilterBar.tsx src/components/storefront/catalog/CatalogFilterDrawer.tsx src/components/storefront/catalog/CatalogProductCard.tsx src/components/storefront/catalog/CatalogProductGrid.tsx
git commit -m "feat: redesign browse and filter surfaces"
```

### Task 5: Rebuild Product Detail, Search Overlay, and Cart Drawer

**Files:**
- Create: `src/components/storefront/product/ProductImageGallery.tsx`
- Create: `src/components/storefront/product/ProductPurchasePanel.tsx`
- Create: `tests/unit/storefront-product-detail.test.tsx`
- Modify: `app/store/[productId]/page.tsx`
- Modify: `src/components/store/ProductDetail.tsx`
- Modify: `src/components/search/SearchOverlay.tsx`
- Modify: `src/components/cart/CartDrawer.tsx`

- [ ] **Step 1: Write the failing product detail render test**

```ts
import { renderToStaticMarkup } from "react-dom/server";

import { ProductDetail } from "@/components/store/ProductDetail";

const product = {
  id: "product-1",
  name: "Sample Product",
  brand: "Brand Name",
  condition: "new",
  description: "Sample description",
  images: [{ id: "img-1", url: "/sample.jpg", is_primary: true }],
  variants: [{ id: "var-1", size_label: "10", sale_price_cents: 25000, stock: 2 }],
};

describe("ProductDetail", () => {
  it("renders the two-column solesneakers layout", () => {
    const html = renderToStaticMarkup(<ProductDetail product={product as never} />);
    expect(html).toContain("Sample Product");
    expect(html).toContain("ADD TO CART");
  });
});
```

- [ ] **Step 2: Run the existing product route tests and typecheck before changing the funnel**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Recompose the PDP and overlay surfaces**

```tsx
// src/components/store/ProductDetail.tsx
import { ProductImageGallery } from "@/components/storefront/product/ProductImageGallery";
import { ProductPurchasePanel } from "@/components/storefront/product/ProductPurchasePanel";

return (
  <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-10 lg:grid-cols-[1fr_1fr]">
    <ProductImageGallery product={product} />
    <ProductPurchasePanel product={product} />
  </div>
);
```

```tsx
// src/components/search/SearchOverlay.tsx
return (
  <div className="fixed inset-0 z-[60] bg-black/40">
    <div className="fixed inset-x-0 top-0 bg-brand-surface border-b border-brand-border px-6 py-4">
      <form className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <Search className="text-brand-muted" />
        <input className="text-lg outline-none placeholder:text-brand-muted" />
        <button type="button" aria-label="Close search">×</button>
      </form>
    </div>
  </div>
);
```

```tsx
// src/components/cart/CartDrawer.tsx
return (
  <div className="fixed inset-0 z-[70]">
    <div className="absolute inset-0 bg-black/45" onClick={onClose} />
    <aside className="absolute inset-y-0 right-0 w-full bg-brand-surface md:w-[420px]">
      <header className="flex items-center justify-between border-b border-brand-border px-6 py-4">
        <h2 className="text-lg font-bold text-brand-text">My cart • {items.length}</h2>
      </header>
    </aside>
  </div>
);
```

- [ ] **Step 4: Run funnel verification**

Run: `npm run lint -- app/store/[productId]/page.tsx src/components/store/ProductDetail.tsx src/components/search/SearchOverlay.tsx src/components/cart/CartDrawer.tsx src/components/storefront/product/ProductImageGallery.tsx src/components/storefront/product/ProductPurchasePanel.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/store/[productId]/page.tsx src/components/store/ProductDetail.tsx src/components/search/SearchOverlay.tsx src/components/cart/CartDrawer.tsx src/components/storefront/product/ProductImageGallery.tsx src/components/storefront/product/ProductPurchasePanel.tsx
git commit -m "feat: redesign pdp search and cart surfaces"
```

### Task 6: Reskin the Auth Shell Without Changing Auth Behavior

**Files:**
- Create: `src/components/auth/AuthPageShell.tsx`
- Create: `tests/unit/auth-shell-branding.test.tsx`
- Modify: `src/components/auth/ui/AuthShell.tsx`
- Modify: `app/auth/layout.tsx`

- [ ] **Step 1: Write the failing auth shell snapshot-style render test**

```ts
import { renderToStaticMarkup } from "react-dom/server";

import AuthShell from "@/components/auth/ui/AuthShell";

describe("AuthShell", () => {
  it("renders solesneakers branding", () => {
    const html = renderToStaticMarkup(<AuthShell><div>form</div></AuthShell>);
    expect(html).toContain("solesneakers");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand tests/unit/auth-shell-branding.test.tsx`
Expected: FAIL because the current auth shell still renders `Realdealkickzsc`

- [ ] **Step 3: Replace the current split-pane auth look**

```tsx
// src/components/auth/ui/AuthShell.tsx
import { brandTheme } from "@/config/brand/solesneakers";

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-brand-page px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <img src={brandTheme.logo.src} alt={brandTheme.logo.alt} className="h-10 w-auto" />
        <div className="mt-10 w-full">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run auth verification**

Run: `npx jest --runInBand tests/unit/auth-shell-branding.test.tsx`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/AuthPageShell.tsx src/components/auth/ui/AuthShell.tsx app/auth/layout.tsx
git commit -m "feat: redesign auth shell for solesneakers"
```

### Task 7: Sync the Admin Shell to the Same Design System

**Files:**
- Create: `src/components/admin/shell/AdminBrandHeader.tsx`
- Create: `src/components/admin/shell/AdminNavItem.tsx`
- Test: `tests/unit/admin-shell-branding.test.tsx`
- Modify: `app/admin/layout.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminTopbar.tsx`

- [ ] **Step 1: Write the failing admin branding test**

```ts
import { renderToStaticMarkup } from "react-dom/server";

import { AdminTopbar } from "@/components/admin/AdminTopbar";

describe("AdminTopbar", () => {
  it("renders solesneakers admin branding", () => {
    const html = renderToStaticMarkup(<AdminTopbar />);
    expect(html).toContain("solesneakers");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand tests/unit/admin-shell-branding.test.tsx`
Expected: FAIL because the current topbar contains `Realdealkickzsc Admin`

- [ ] **Step 3: Replace admin shell branding and token usage**

```tsx
// app/admin/layout.tsx
return (
  <div className="min-h-screen bg-brand-page">
    <AdminSidebar userEmail={userEmail} role={session.role} />
    <div className="flex min-h-screen flex-col md:ml-64">
      <AdminTopbar />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  </div>
);
```

```tsx
// src/components/admin/AdminTopbar.tsx
export function AdminTopbar() {
  return (
    <div className="border-b border-brand-border bg-brand-surface px-6 py-6">
      <h1 className="text-xl font-bold uppercase tracking-[0.08em] text-brand-text">
        solesneakers admin
      </h1>
    </div>
  );
}
```

```tsx
// src/components/admin/AdminSidebar.tsx
const activeItemClass = "bg-brand-text text-brand-surface";
const inactiveItemClass = "text-brand-text hover:bg-brand-page";
```

- [ ] **Step 4: Run the admin branding test to verify it passes**

Run: `npx jest --runInBand tests/unit/admin-shell-branding.test.tsx`
Expected: PASS

- [ ] **Step 5: Run admin shell verification**

Run: `npm run lint -- app/admin/layout.tsx src/components/admin/AdminSidebar.tsx src/components/admin/AdminTopbar.tsx src/components/admin/shell/AdminBrandHeader.tsx src/components/admin/shell/AdminNavItem.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/admin/layout.tsx src/components/admin/AdminSidebar.tsx src/components/admin/AdminTopbar.tsx src/components/admin/shell/AdminBrandHeader.tsx src/components/admin/shell/AdminNavItem.tsx tests/unit/admin-shell-branding.test.tsx
git commit -m "feat: align admin shell with solesneakers theme"
```

### Task 8: Final Cleanup and Full Verification

**Files:**
- Modify: any touched files from Tasks 1-7
- Test: `tests/unit/solesneakers-brand-config.test.ts`
- Test: `tests/unit/storefront-header.test.tsx`
- Test: `tests/unit/storefront-homepage.test.tsx`
- Test: `tests/unit/admin-shell-branding.test.tsx`

- [ ] **Step 1: Remove leftover RDK frontend branding references in touched UI files**

```bash
rg -n "Realdealkickzsc|RDK|rdk-logo|bg-red-600|text-red-600|border-zinc-800|bg-black" app src/components src/styles
```

Expected: only intentional non-UI or backend/domain references remain; touched frontend files should no longer use old storefront branding tokens.

- [ ] **Step 2: Run the targeted unit suite**

Run: `npx jest --runInBand tests/unit/solesneakers-brand-config.test.ts tests/unit/storefront-header.test.tsx tests/unit/storefront-homepage.test.tsx tests/unit/storefront-product-detail.test.tsx tests/unit/auth-shell-branding.test.tsx tests/unit/admin-shell-branding.test.tsx tests/unit/checkout-page.test.tsx`
Expected: PASS

- [ ] **Step 3: Run repository-wide verification**

Run: `npm run lint`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Run manual route checks**

Run: `npm run dev`
Expected: Next.js dev server starts successfully

Manual checks:
- `/`
- `/store`
- `/store/<valid-product-id>`
- `/auth/login`
- `/auth/register`
- `/cart`
- `/admin/dashboard`
- `/admin/inventory`

- [ ] **Step 5: Commit**

```bash
git add app src/components src/styles tests/unit tailwind.config.ts
git commit -m "chore: finalize solesneakers frontend redesign"
```
