-- Migration for creating the shipping origin table
CREATE TABLE public.shipping_origins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    line1 TEXT NOT NULL,
    line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- For this application, we will assume a single shipping origin address.
-- A trigger can enforce that only one row exists in this table.
CREATE OR REPLACE FUNCTION enforce_single_shipping_origin()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM public.shipping_origins) > 1 THEN
    RAISE EXCEPTION 'Only one shipping origin is allowed.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER single_shipping_origin_trigger
BEFORE INSERT ON public.shipping_origins
FOR EACH STATEMENT EXECUTE FUNCTION enforce_single_shipping_origin();


ALTER TABLE public.shipping_origins ENABLE ROW LEVEL SECURITY;

-- Only admins can read or write the shipping origin.
CREATE POLICY "Allow admin full access" ON public.shipping_origins
FOR ALL
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'dev')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'dev')
);
