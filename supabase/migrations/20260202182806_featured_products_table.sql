-- Migration: Add featured_items table
-- Description: Stores which products are featured on the home page

-- (Optional but safe) ensure UUID generator exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- (Optional but safe) ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.featured_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_featured_product_per_tenant UNIQUE (tenant_id, product_id)
);

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_featured_items_tenant_sort
  ON public.featured_items(tenant_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_featured_items_product
  ON public.featured_items(product_id);

-- Enable RLS
ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;

-- Policies (drop+recreate for idempotency)
DROP POLICY IF EXISTS "Featured items are viewable by everyone" ON public.featured_items;
CREATE POLICY "Featured items are viewable by everyone"
  ON public.featured_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage featured items" ON public.featured_items;
CREATE POLICY "Admins can manage featured items"
  ON public.featured_items FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('admin', 'super_admin', 'dev')
    )
  );

-- updated_at trigger (drop+recreate)
DROP TRIGGER IF EXISTS set_featured_items_updated_at ON public.featured_items;
CREATE TRIGGER set_featured_items_updated_at
  BEFORE UPDATE ON public.featured_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

COMMENT ON TABLE public.featured_items IS 'Products featured on the home page';
COMMENT ON COLUMN public.featured_items.sort_order IS 'Display order (lower numbers first)';
