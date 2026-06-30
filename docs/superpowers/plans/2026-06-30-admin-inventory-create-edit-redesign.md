# Admin Inventory Create/Edit Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the inventory create and edit shells so they read as one cohesive admin workflow without changing the underlying form behavior.

**Architecture:** Keep create and edit data flow exactly where it is today, and limit the work to route framing plus the edit wrapper state. Rebuild both route pages around the shared admin header/navigation pattern, then restyle the archived/edit wrapper in `app/admin/inventory/[id]/edit/client.tsx` using the same admin primitives already used elsewhere.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind utility classes, existing admin UI primitives, existing inventory form flow

---

## File Structure

**Modify:**
- `app/admin/inventory/create/page.tsx`
- `app/admin/inventory/[id]/edit/page.tsx`
- `app/admin/inventory/[id]/edit/client.tsx`

**Read for patterns/reference:**
- `app/admin/customers/[customerId]/page.tsx`
- `app/admin/catalog/page.tsx`
- `app/admin/featured-items/client.tsx`
- `src/components/admin/ui/AdminPageHeader.tsx`
- `src/components/admin/ui/AdminSectionCard.tsx`
- `src/components/admin/ui/AdminEmptyState.tsx`
- `src/components/admin/ui/adminButtonStyles.ts`

**Verification:**
- `npx prettier --write app/admin/inventory/create/page.tsx "app/admin/inventory/[id]/edit/page.tsx" "app/admin/inventory/[id]/edit/client.tsx"`
- `npx eslint app/admin/inventory/create/page.tsx "app/admin/inventory/[id]/edit/page.tsx" "app/admin/inventory/[id]/edit/client.tsx"`
- `npm run typecheck`

### Task 1: Normalize The Create Page Shell

**Files:**
- Modify: `app/admin/inventory/create/page.tsx`

- [ ] **Step 1: Replace the legacy create-page header with the shared admin page header pattern**

Required structure:
- back link styled with shared admin language
- `AdminPageHeader` title and description
- existing `CreateProductClient` kept intact

- [ ] **Step 2: Keep the server-side bootstrap logic untouched while changing only the shell**

Preserve:
- `getFormInitialData()`
- `initialShippingDefaults`
- `initialBrands`

- [ ] **Step 3: Format the create page**

Run: `npx prettier --write app/admin/inventory/create/page.tsx`

Expected: file formats cleanly

- [ ] **Step 4: Commit**

```bash
git add app/admin/inventory/create/page.tsx
git commit -m "style: normalize inventory create page shell"
```

### Task 2: Normalize The Edit Page Shell

**Files:**
- Modify: `app/admin/inventory/[id]/edit/page.tsx`

- [ ] **Step 1: Replace the legacy edit-page header with the same shared admin header/back-nav pattern used on create**

Required structure:
- same visual rhythm as create
- edit-specific title/description copy
- keep `EditProductClient` props unchanged

- [ ] **Step 2: Preserve existing product load / not-found flow**

Preserve:
- `getEditFormInitialData(id)`
- `notFound()`
- all current props passed into `EditProductClient`

- [ ] **Step 3: Format the edit route page**

Run: `npx prettier --write "app/admin/inventory/[id]/edit/page.tsx"`

Expected: file formats cleanly

- [ ] **Step 4: Commit**

```bash
git add "app/admin/inventory/[id]/edit/page.tsx"
git commit -m "style: normalize inventory edit page shell"
```

### Task 3: Restyle The Edit Client Wrapper

**Files:**
- Modify: `app/admin/inventory/[id]/edit/client.tsx`

- [ ] **Step 1: Replace the archived-product dark wrapper with shared admin surface and button styling**

Required changes:
- use `AdminSectionCard` for archived-state wrapper
- use `adminButtonStyles.primary` / `secondary`
- use `brand-*` text and border colors

- [ ] **Step 2: Keep existing behaviors intact**

Preserve:
- `handleRestore`
- `handleSubmit`
- `handleCancel`
- current `ProductForm` props and `initialData` mapping

- [ ] **Step 3: Make the archived state read as part of the same inventory workflow**

Required structure:
- product name and archive message in shared typography
- restore and back actions in a single action zone
- no `zinc` or bespoke button styles remaining in the wrapper

- [ ] **Step 4: Run targeted lint and formatting**

Run: `npx prettier --write "app/admin/inventory/[id]/edit/client.tsx"`

Run: `npx eslint "app/admin/inventory/[id]/edit/client.tsx"`

Expected: both commands complete cleanly

- [ ] **Step 5: Commit**

```bash
git add "app/admin/inventory/[id]/edit/client.tsx"
git commit -m "style: align inventory edit wrapper with admin system"
```

### Task 4: Final Verification And Cleanup

**Files:**
- Modify: `app/admin/inventory/create/page.tsx`
- Modify: `app/admin/inventory/[id]/edit/page.tsx`
- Modify: `app/admin/inventory/[id]/edit/client.tsx`

- [ ] **Step 1: Remove any unused imports or leftover legacy utility classes from the touched inventory files**

Checklist:
- no dead `ArrowLeft`/`Link` imports if route shell changes reduce them
- no leftover `bg-zinc`, `border-zinc`, `text-gray`, or `text-white` classes in touched files
- no unused admin primitive imports

- [ ] **Step 2: Run full verification for this pass**

Run: `npx eslint app/admin/inventory/create/page.tsx "app/admin/inventory/[id]/edit/page.tsx" "app/admin/inventory/[id]/edit/client.tsx"`

Expected: no lint errors

Run: `npm run typecheck`

Expected:
```text
> typecheck
> tsc --noEmit
```

- [ ] **Step 3: Scan touched files for legacy styling tokens**

Run: `rg -n "bg-zinc|border-zinc|text-gray|text-white" app/admin/inventory/create/page.tsx app/admin/inventory/[id]/edit/page.tsx app/admin/inventory/[id]/edit/client.tsx`

Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add app/admin/inventory/create/page.tsx "app/admin/inventory/[id]/edit/page.tsx" "app/admin/inventory/[id]/edit/client.tsx"
git commit -m "style: complete inventory create edit redesign"
```
