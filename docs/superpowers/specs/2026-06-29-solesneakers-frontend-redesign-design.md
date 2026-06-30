# Solesneakers Frontend Redesign Design

**Date:** 2026-06-29

**Goal**

Replace the current branch's storefront and admin visual layer with a `solesneakers` frontend while keeping the existing route map, backend contracts, data-fetching behavior, and business workflows intact. The redesign must also improve frontend architecture, file organization, naming, and component reuse so this branch becomes the maintainable base for the second client deployment.

## Scope

This redesign applies to:

- Storefront UI
- Auth UI
- Cart and search overlays/drawers
- Product browsing and product detail UI
- Admin portal visual shell and shared admin UI surfaces
- Global design tokens, layout primitives, and frontend file organization

This redesign does not change:

- Route structure or route purposes
- API routes
- Database models
- Backend services and repositories
- Authentication, checkout, cart, order, or inventory business logic
- Existing data contracts between pages/components and backend sources

## Product Constraints

- This branch is the dedicated development branch for `solesneakers`.
- The current frontend can be overwritten on this branch.
- The existing RDK deployment remains preserved elsewhere and does not need visual backward compatibility here.
- The redesign is frontend-only in behavior terms: no intentional functional workflow changes.
- Existing routes should remain in place even if the new design brief maps to a slightly different conceptual storefront structure.

## Design System

The `solesneakers` design system follows the approved client brief.

### Colors

- Page background: `#EFEFEF`
- Surface/background elevation: `#FFFFFF`
- Primary text: `#111111`
- Muted text: `#888888`
- Accent/CTA: `#111111`
- Sale price: `#CC0000`
- Borders/dividers: `#E0E0E0`
- Announcement bar: `#000000` with white text
- Overlay scrim: `rgba(0,0,0,0.45)`

### Typography

- Headings and UI text use `Inter`
- Headings are uppercase, bold, tracked, and editorial
- Product metadata uses smaller uppercase labels with muted color
- CTA buttons use bold uppercase text with wider tracking
- The brand wordmark is an image placeholder at `/images/logo.svg`

### Layout Rules

- Max content width: `1440px`
- Horizontal padding scales from `px-6` to `px-16`
- Major section spacing uses `py-16`
- Grid/card spacing uses `gap-4` to `gap-6`
- Interactive elements use no border radius by default
- Pill badges remain `rounded-full`

### Placeholder Content Rules

The following remain explicitly stubbed for client replacement:

- Logo asset
- Hero image
- Brand lifestyle images
- Brand-specific product images
- Brand names in showcase sections
- Hero headline copy
- Hero shipping badge copy
- Rating totals/review count copy
- Temporary contact/branding text

Branding replacements required immediately in code:

- Store/client brand becomes `solesneakers`
- Temporary Instagram/contact `@` reference becomes `null@gmail.com`

## Architecture

The frontend will be reorganized into four layers.

### 1. Theme Layer

Centralize `solesneakers` tokens in Tailwind and global CSS:

- brand colors
- typography
- shell spacing
- borders/dividers
- buttons and form controls
- overlays/drawers
- focus states

This replaces the current branch-wide black/red styling defaults with a single source of truth.

### 2. Shell Layer

Create shared shells and navigation structures for both storefront and admin:

- storefront header/navbar
- mobile sidebar drawer
- search overlay
- cart drawer
- auth shell
- admin shell

These shells should own layout and interaction framing, while feature components render the route-specific content inside them.

### 3. Feature UI Layer

Group presentational and interactive components by domain:

- storefront home
- storefront catalog/browse
- storefront product detail
- storefront cart
- storefront search
- auth
- admin shell
- admin shared form/table/panel primitives

Feature components should focus on one visual responsibility and avoid mixing unrelated navigation, fetching, and styling logic into oversized files.

### 4. Page Composition Layer

Keep route files thin and aligned with Next.js App Router conventions:

- route pages compose feature components
- route layouts remain in `app/`
- server components stay server by default
- client components exist only where UI state/browser APIs are required

## File And Folder Organization

The rewrite should produce a more logical and standards-aligned frontend structure.

### Principles

- Use route-owned composition in `app/`
- Use domain-owned reusable components in `src/components`
- Prefer smaller focused files over large monoliths
- Keep one primary component per file where practical
- Co-locate small private subcomponents near their owning feature
- Avoid promoting feature-specific code into global shared folders without a real reuse case

### Naming Standards

- React component files: `PascalCase.tsx`
- Hooks: `useSomething.ts`
- Utilities/helpers: follow stable repo convention, preferring `kebab-case.ts` for non-component modules
- Shared styling utilities should use clear semantic names rather than old-client brand names
- Remove or rename legacy `rdk`-specific frontend identifiers where they only describe UI branding rather than stable domain meaning

### Target Component Organization

The exact final structure can adapt to the existing codebase, but it should move toward:

- `src/components/storefront/shell`
- `src/components/storefront/home`
- `src/components/storefront/catalog`
- `src/components/storefront/product`
- `src/components/storefront/cart`
- `src/components/storefront/search`
- `src/components/auth`
- `src/components/admin/shell`
- `src/components/admin/forms`
- `src/components/ui`

Supporting non-visual frontend utilities may also need clearer grouping if touched during the rewrite, but backend/service folders are out of scope unless a frontend dependency boundary requires a small supporting move.

## Route And UI Mapping

The redesign keeps existing routes but remaps their visual presentation to the `solesneakers` design system.

### Homepage

- Replace the current hero/category presentation with the approved editorial hero and stacked showcase sections
- Keep existing route behavior intact
- Reuse shared section primitives where possible

### Navbar / Header

- Replace current RDK-branded nav visuals
- Support the approved desktop and mobile treatments
- Preserve current behavioral triggers for search/cart/auth where they already exist

### Sidebar Drawer

- Implement the left drawer structure from the brief
- Keep category/brand/size navigation compatible with current store routes/query patterns

### Search Overlay

- Reskin and reorganize the existing search UI to match the new overlay system
- Preserve result data behavior and search invocation flow

### Auth Pages

- Keep the existing route purposes and auth flows
- Rebuild the visual shell and form styling to match the brief
- Ensure mobile spacing and accessibility requirements are satisfied

### Collection / Browse Pages

- Retain current filtering/sorting/product loading behavior
- Replace toolbar, filter strip, card styling, and layout toggles with the new design

### Product Detail Page

- Preserve product data behavior
- Rebuild image gallery, metadata, selectors, and purchase call-to-action styling

### Cart Drawer / Cart Page

- Preserve cart logic
- Remove excluded design elements from the old experience
- Apply the new drawer and footer treatment from the brief

### Admin Portal

- Reskin admin layout, sidebar, topbar, cards, forms, buttons, and tables
- Keep all functional workflows and route structure intact
- Reuse shared input/button/panel primitives where that improves consistency without creating poor coupling

## Reuse Strategy

Shared UI should be reusable by responsibility, not by accidental similarity.

Expected reusable primitives include:

- buttons
- text inputs
- field shells/labels
- section headings
- badges
- panels
- overlay containers
- drawers
- toolbar rows
- product card building blocks

Storefront and admin can share primitives where semantics align, but they should not be forced to share feature components with different responsibilities.

## Code Clarity Rules

During the rewrite:

- remove hardcoded legacy brand colors where tokens should exist
- reduce inline `style={{}}` usage where Tailwind or scoped CSS tokens are more appropriate
- keep JSX files focused on rendering rather than mixed transformation logic
- extract helper functions when visual components become hard to read
- remove dead imports and legacy commented code
- keep accessibility labels and visible text intact for interactive elements
- use `next/image` for image rendering where applicable

## Mobile And Accessibility Requirements

The redesign must satisfy the mobile checklist from the brief:

- mobile-first navigation with hamburger/centered logo/cart emphasis
- horizontally scrollable carousel/filter patterns where specified
- `grid-cols-2` minimum for product grids on mobile
- full-screen cart drawer on mobile
- stacked PDP layout on smaller screens
- form padding and tap target sizing appropriate for mobile devices
- accessible labeling for buttons, inputs, and overlays
- visible focus states aligned to the new design system

## Implementation Boundaries

The rewrite will be executed in three broad passes:

### Pass 1: Shared Foundation

- Tailwind/global token setup
- shared UI primitives
- storefront shell rebuild
- overlay/drawer infrastructure
- admin shell reskin foundation

### Pass 2: Storefront Routes

- homepage
- browse/collection/store pages
- product detail page
- auth pages
- cart page/drawer
- search overlay

### Pass 3: Admin Visual Sync

- admin sidebar/topbar
- admin cards/panels
- admin forms/inputs
- admin tables/buttons
- residual route-specific admin polish

## Verification Strategy

The redesign should be verified with:

- lint
- typecheck
- targeted unit/component tests where behavior-adjacent UI changes require them
- manual route checks for major storefront and admin surfaces
- responsive verification across mobile and desktop breakpoints

Success means:

- `solesneakers` branding and design tokens are applied consistently
- legacy RDK visual styling is removed from this branch's frontend UI
- routes and workflows still function as before
- component boundaries and naming are materially cleaner than the current branch state
- storefront and admin feel like one coherent frontend system
