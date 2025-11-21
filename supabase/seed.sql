-- ============================================
-- REAL DEAL KICKZ — DEMO SEED DATA (Non-Production Only)
-- ============================================

-- ---------- TENANT ----------
insert into tenants (id, name)
values
  ('00000000-0000-0000-0000-000000000001', 'Demo Tenant');

-- ---------- MARKETPLACE ----------
insert into marketplaces (id, tenant_id, name)
values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Demo Marketplace');

-- ---------- SELLER ----------
insert into sellers (id, tenant_id, name)
values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Demo Seller');

-- ---------- PRODUCTS ----------
insert into products (
  id,
  tenant_id,
  seller_id,
  marketplace_id,
  name,
  brand,
  description,
  price,
  shoe_sizes,
  clothing_sizes,
  images,
  condition
)
values
  ('20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    'Jordan 1 Retro High OG “Bred”',
    'Jordan',
    'Classic colorway. Condition: New.',
    350.00,
    '{8,9,10,11}',
    null,
    '{"https://example.com/jordan1.jpg"}',
    'new'
  ),
  ('20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    'Yeezy Boost 350 V2 “Zebra”',
    'Adidas',
    'Primeknit upper. Condition: Used.',
    280.00,
    '{9,10}',
    null,
    '{"https://example.com/yeezy350.jpg"}',
    'used'
  ),
  ('20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    'Nike Tech Fleece Hoodie',
    'Nike',
    'Men’s black tech fleece hoodie.',
    110.00,
    null,
    '{ "S", "M", "L", "XL" }',
    '{"https://example.com/techfleece.jpg"}',
    'new'
  );
