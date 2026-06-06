# Variant Row Layout Design

## Goal

Keep the five variant fields on one horizontal row on desktop widths while preserving the existing stacked layout on smaller screens.

## Current State

The variants section in `src/components/inventory/ProductForm.tsx` already uses a five-column desktop grid, but the desktop track sizes are wide enough that the row still behaves like a vertical form at common laptop widths.

## Design

On desktop breakpoints, the variant row should continue to use a five-column grid in this order:

1. SKU
2. Size
3. Sale Price
4. Unit Cost
5. Stock

The change is layout-only:

- reduce the desktop grid track widths
- allow the size column to flex within a smaller range
- keep field order, validation, and controls unchanged
- preserve the mobile and small-tablet stacked layout

## Constraints

- No behavior changes
- No API or data model changes
- No visual redesign outside the variants row

## Verification

- Open the product form on a desktop-width viewport
- Confirm each variant row shows all five fields on one line
- Confirm smaller breakpoints still stack vertically
