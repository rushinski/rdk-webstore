# Variant Row Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the five variant fields on one row on desktop widths without changing the existing mobile stacked layout.

**Architecture:** Adjust the desktop grid track definitions inside the existing variant row in `ProductForm`. Preserve the current markup and behavior, changing only the responsive sizing classes that control how the five fields lay out.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS

---

### Task 1: Tighten The Desktop Variant Grid

**Files:**
- Modify: `src/components/inventory/ProductForm.tsx`
- Verify: `src/components/inventory/ProductForm.tsx`

- [ ] **Step 1: Inspect the current desktop grid classes**

Open the variant row section and confirm the existing container class includes:

```tsx
<div className="flex-1 grid grid-cols-1 md:grid-cols-[9rem_12rem_8rem_8rem_5rem] xl:grid-cols-[10rem_13rem_9rem_9rem_6rem] gap-2 md:gap-3">
```

- [ ] **Step 2: Replace the desktop track sizes with tighter widths**

Update the class string to use smaller desktop tracks and a flexible size column:

```tsx
<div className="flex-1 grid grid-cols-1 lg:grid-cols-[8rem_minmax(9rem,1fr)_7.5rem_7.5rem_5.5rem] xl:grid-cols-[9rem_minmax(10rem,1fr)_8rem_8rem_6rem] gap-2 md:gap-3">
```

- [ ] **Step 3: Verify the layout behavior manually**

Check the product form in a desktop viewport and confirm:

```text
SKU | Size | Sale Price | Unit Cost | Stock
```

all appear on one row per variant card, while smaller breakpoints still stack vertically.

- [ ] **Step 4: Run a focused verification command**

Run:

```bash
npm run typecheck
```

Expected: TypeScript completes without errors caused by the layout change.
