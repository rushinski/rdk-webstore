begin;

insert into public.tenants (name)
select 'Real Deal Kickz'
where not exists (
  select 1 from public.tenants where name = 'Real Deal Kickz'
);

insert into public.marketplaces (tenant_id, name)
select t.id, 'RDK Storefront'
from public.tenants t
where t.name = 'Real Deal Kickz'
  and not exists (
    select 1 from public.marketplaces m
    where m.tenant_id = t.id
      and m.name = 'RDK Storefront'
  );

with seed_context as (
  select
    (select id from public.tenants where name = 'Real Deal Kickz' limit 1) as tenant_id,
    (
      select id
      from public.marketplaces
      where name = 'RDK Storefront'
        and tenant_id = (select id from public.tenants where name = 'Real Deal Kickz' limit 1)
      limit 1
    ) as marketplace_id
),
seed_products as (
  select * from (values
    ('SEED-NIKE-AF1', 'Nike Air Force 1 Triple White', 'Triple White', 'Nike', 'Air Force 1', 'sneakers', 'new', true, true, 15000, 'shoe', '10', 8, 9000, 'Classic leather low-top.', '/images/rdk-logo.png', 0.95),
    ('SEED-NIKE-BLAZER', 'Nike Blazer Vintage Mid', 'Vintage Mid', 'Nike', 'Blazer', 'sneakers', 'new', true, true, 13000, 'shoe', '9.5', 6, 8000, 'Vintage-inspired mid silhouette.', '/images/rdk-logo.png', 0.95),
    ('SEED-NIKE-P6000', 'Nike P-6000 Metallic Silver', 'Metallic Silver', 'Nike', 'P-6000', 'sneakers', 'new', true, true, 12000, 'shoe', '10.5', 5, 7500, 'Retro runner with layered mesh.', '/images/rdk-logo.png', 0.95),
    ('SEED-NIKE-FOAMPOSITE', 'Nike Foamposite Royal', 'Royal', 'Nike', 'Foamposite', 'sneakers', 'new', true, true, 24000, 'shoe', '11', 4, 15000, 'Iconic molded upper and carbon plate.', '/images/rdk-logo.png', 0.95),
    ('SEED-NIKE-KOBE', 'Nike Kobe Protro', 'Protro', 'Nike', 'Kobe', 'sneakers', 'new', true, true, 28000, 'shoe', '10', 3, 17000, 'Court-ready update with responsive cushioning.', '/images/rdk-logo.png', 0.95),
    ('SEED-NIKE-OTHER', 'Nike Shox R4', 'Shox R4', 'Nike', 'Other Nike Models', 'sneakers', 'new', true, false, 14000, 'shoe', '9', 5, 9000, 'Fallback model sample for Nike.', '/images/rdk-logo.png', 0.4),
    ('SEED-AIRJORDAN-1', 'Air Jordan 1 Chicago', 'Chicago', 'Air Jordan', 'Air Jordan 1', 'sneakers', 'used', true, true, 22000, 'shoe', '10', 2, 14000, 'Light wear with original box.', '/images/rdk-logo.png', 0.9),
    ('SEED-AIRJORDAN-OTHER', 'Air Jordan Flight Unknown', 'Flight Unknown', 'Air Jordan', 'Other Air Jordan Models', 'sneakers', 'new', true, false, 19000, 'shoe', '11', 2, 12000, 'Fallback model sample for Air Jordan.', '/images/rdk-logo.png', 0.4),
    ('SEED-OFFWHITE-OOO', 'Off-White Out Of Office', 'Out Of Office', 'Off-White', 'Out Of Office (OOO)', 'sneakers', 'new', true, true, 42000, 'shoe', '9', 1, 26000, 'Signature Off-White paneling and zip tie.', '/images/rdk-logo.png', 0.85),
    ('SEED-MCQUEEN-OS', 'Alexander McQueen Oversized Sneaker', 'Oversized Sneaker', 'Alexander McQueen', 'Oversized Sneaker', 'sneakers', 'new', true, true, 52000, 'shoe', '9', 2, 32000, 'Oversized sole with clean leather upper.', '/images/rdk-logo.png', 0.85),
    ('SEED-RICK-OWENS-RAMONES', 'Rick Owens DRKSHDW Ramones', 'DRKSHDW Ramones', 'Rick Owens', 'DRKSHDW Ramones', 'sneakers', 'new', true, true, 36000, 'shoe', '9', 2, 22000, 'Minimal high-top with oversized sole.', '/images/rdk-logo.png', 0.85),
    ('SEED-TIMBERLAND-6', 'Timberland Premium 6-Inch Waterproof Boot', 'Premium 6-Inch Waterproof Boot', 'Timberland', 'Premium 6-Inch Waterproof Boot', 'sneakers', 'new', true, true, 19000, 'shoe', '9.5', 4, 12000, 'Waterproof nubuck boot.', '/images/rdk-logo.png', 0.85),
    ('SEED-OTHER-SNEAKER', 'Other Mystery Runner', 'Mystery Runner', 'Other', null, 'sneakers', 'new', false, false, 9000, 'shoe', '8.5', 5, 5000, 'Unknown brand sneaker sample.', '/images/rdk-logo.png', 0.2),
    ('SEED-SUPREME-HOODIE', 'Supreme Box Logo Hoodie', 'Box Logo Hoodie', 'Supreme', null, 'clothing', 'new', true, true, 18000, 'clothing', 'M', 6, 10000, 'Heavyweight fleece hoodie.', '/images/rdk-logo.png', 0.9),
    ('SEED-VALLEY-TEE', 'Valley Logo Tee', 'Logo Tee', 'Valley', null, 'clothing', 'new', true, true, 4500, 'clothing', 'L', 10, 2000, 'Soft cotton graphic tee.', '/images/rdk-logo.png', 0.9),
    ('SEED-GODSPEED-JACKET', 'Godspeed Racing Jacket', 'Racing Jacket', 'Godspeed', null, 'clothing', 'new', true, true, 12000, 'clothing', 'L', 4, 7000, 'Racing-inspired outerwear.', '/images/rdk-logo.png', 0.9),
    ('SEED-GV-PANTS', 'GV Gallery Painter Pants', 'Painter Pants', 'GV Gallery', null, 'clothing', 'new', true, true, 9500, 'clothing', 'M', 5, 5000, 'Utility pants with paint splatter.', '/images/rdk-logo.png', 0.9),
    ('SEED-SP5DER-HOODIE', 'Sp5der Web Hoodie', 'Web Hoodie', 'Sp5der', null, 'clothing', 'new', true, true, 17000, 'clothing', 'XL', 3, 9000, 'Signature web graphic hoodie.', '/images/rdk-logo.png', 0.9),
    ('SEED-CHROME-TEE', 'Chrome Hearts Cross Patch Tee', 'Cross Patch Tee', 'Chrome Hearts', null, 'clothing', 'new', true, true, 25000, 'clothing', 'L', 2, 15000, 'Cross patch detailing.', '/images/rdk-logo.png', 0.9),
    ('SEED-OTHER-CREW', 'Other Vintage Crewneck', 'Vintage Crewneck', 'Other', null, 'clothing', 'new', false, true, 6500, 'clothing', 'S', 4, 3000, 'Unknown brand vintage crewneck.', '/images/rdk-logo.png', 0.2),
    ('SEED-OTHER-CAP', 'Other Collector Cap', 'Collector Cap', 'Other', null, 'accessories', 'new', false, true, 3500, 'none', 'One Size', 12, 1200, 'One size accessories sample.', '/images/rdk-logo.png', 0.2),
    ('SEED-OTHER-CONSOLE', 'Other Console Bundle', 'Console Bundle', 'Other', null, 'electronics', 'new', false, true, 40000, 'none', 'One Size', 1, 30000, 'Electronics category sample.', '/images/rdk-logo.png', 0.2)
  ) as v(
    sku,
    title_raw,
    name,
    brand,
    model,
    category,
    condition,
    brand_is_verified,
    model_is_verified,
    price_cents,
    size_type,
    size_label,
    stock,
    cost_cents,
    description,
    image_url,
    parse_confidence
  )
)
insert into public.products (
  tenant_id,
  marketplace_id,
  brand,
  model,
  name,
  title_raw,
  title_display,
  brand_is_verified,
  model_is_verified,
  parse_confidence,
  parse_version,
  category,
  condition,
  condition_note,
  description,
  sku,
  cost_cents,
  is_active
)
select
  seed_context.tenant_id,
  seed_context.marketplace_id,
  seed_products.brand,
  seed_products.model,
  seed_products.name,
  seed_products.title_raw,
  seed_products.title_raw,
  seed_products.brand_is_verified,
  seed_products.model_is_verified,
  seed_products.parse_confidence,
  'seed',
  seed_products.category,
  seed_products.condition,
  null,
  seed_products.description,
  seed_products.sku,
  seed_products.cost_cents,
  true
from seed_products
cross join seed_context
where seed_context.tenant_id is not null
  and seed_context.marketplace_id is not null
  and not exists (
    select 1
    from public.products p
    where p.tenant_id = seed_context.tenant_id
      and p.sku = seed_products.sku
  );

with seed_context as (
  select
    (select id from public.tenants where name = 'Real Deal Kickz' limit 1) as tenant_id
),
seed_products as (
  select * from (values
    ('SEED-NIKE-AF1', 'shoe', '10', 15000, 8, 9000),
    ('SEED-NIKE-BLAZER', 'shoe', '9.5', 13000, 6, 8000),
    ('SEED-NIKE-P6000', 'shoe', '10.5', 12000, 5, 7500),
    ('SEED-NIKE-FOAMPOSITE', 'shoe', '11', 24000, 4, 15000),
    ('SEED-NIKE-KOBE', 'shoe', '10', 28000, 3, 17000),
    ('SEED-NIKE-OTHER', 'shoe', '9', 14000, 5, 9000),
    ('SEED-AIRJORDAN-1', 'shoe', '10', 22000, 2, 14000),
    ('SEED-AIRJORDAN-OTHER', 'shoe', '11', 19000, 2, 12000),
    ('SEED-OFFWHITE-OOO', 'shoe', '9', 42000, 1, 26000),
    ('SEED-MCQUEEN-OS', 'shoe', '9', 52000, 2, 32000),
    ('SEED-RICK-OWENS-RAMONES', 'shoe', '9', 36000, 2, 22000),
    ('SEED-TIMBERLAND-6', 'shoe', '9.5', 19000, 4, 12000),
    ('SEED-OTHER-SNEAKER', 'shoe', '8.5', 9000, 5, 5000),
    ('SEED-SUPREME-HOODIE', 'clothing', 'M', 18000, 6, 10000),
    ('SEED-VALLEY-TEE', 'clothing', 'L', 4500, 10, 2000),
    ('SEED-GODSPEED-JACKET', 'clothing', 'L', 12000, 4, 7000),
    ('SEED-GV-PANTS', 'clothing', 'M', 9500, 5, 5000),
    ('SEED-SP5DER-HOODIE', 'clothing', 'XL', 17000, 3, 9000),
    ('SEED-CHROME-TEE', 'clothing', 'L', 25000, 2, 15000),
    ('SEED-OTHER-CREW', 'clothing', 'S', 6500, 4, 3000),
    ('SEED-OTHER-CAP', 'none', 'One Size', 3500, 12, 1200),
    ('SEED-OTHER-CONSOLE', 'none', 'One Size', 40000, 1, 30000)
  ) as v(
    sku,
    size_type,
    size_label,
    price_cents,
    stock,
    cost_cents
  )
)
insert into public.product_variants (
  product_id,
  size_type,
  size_label,
  price_cents,
  stock,
  cost_cents
)
select
  p.id,
  seed_products.size_type,
  seed_products.size_label,
  seed_products.price_cents,
  seed_products.stock,
  seed_products.cost_cents
from seed_products
cross join seed_context
join public.products p
  on p.tenant_id = seed_context.tenant_id
  and p.sku = seed_products.sku
where seed_context.tenant_id is not null
  and not exists (
    select 1
    from public.product_variants v
    where v.product_id = p.id
      and v.size_type = seed_products.size_type
      and v.size_label = seed_products.size_label
  );

with seed_context as (
  select
    (select id from public.tenants where name = 'Real Deal Kickz' limit 1) as tenant_id
),
seed_products as (
  select * from (values
    ('SEED-NIKE-AF1', '/images/rdk-logo.png'),
    ('SEED-NIKE-BLAZER', '/images/rdk-logo.png'),
    ('SEED-NIKE-P6000', '/images/rdk-logo.png'),
    ('SEED-NIKE-FOAMPOSITE', '/images/rdk-logo.png'),
    ('SEED-NIKE-KOBE', '/images/rdk-logo.png'),
    ('SEED-NIKE-OTHER', '/images/rdk-logo.png'),
    ('SEED-AIRJORDAN-1', '/images/rdk-logo.png'),
    ('SEED-AIRJORDAN-OTHER', '/images/rdk-logo.png'),
    ('SEED-OFFWHITE-OOO', '/images/rdk-logo.png'),
    ('SEED-MCQUEEN-OS', '/images/rdk-logo.png'),
    ('SEED-RICK-OWENS-RAMONES', '/images/rdk-logo.png'),
    ('SEED-TIMBERLAND-6', '/images/rdk-logo.png'),
    ('SEED-OTHER-SNEAKER', '/images/rdk-logo.png'),
    ('SEED-SUPREME-HOODIE', '/images/rdk-logo.png'),
    ('SEED-VALLEY-TEE', '/images/rdk-logo.png'),
    ('SEED-GODSPEED-JACKET', '/images/rdk-logo.png'),
    ('SEED-GV-PANTS', '/images/rdk-logo.png'),
    ('SEED-SP5DER-HOODIE', '/images/rdk-logo.png'),
    ('SEED-CHROME-TEE', '/images/rdk-logo.png'),
    ('SEED-OTHER-CREW', '/images/rdk-logo.png'),
    ('SEED-OTHER-CAP', '/images/rdk-logo.png'),
    ('SEED-OTHER-CONSOLE', '/images/rdk-logo.png')
  ) as v(sku, image_url)
)
insert into public.product_images (
  product_id,
  url,
  sort_order,
  is_primary
)
select
  p.id,
  seed_products.image_url,
  0,
  true
from seed_products
cross join seed_context
join public.products p
  on p.tenant_id = seed_context.tenant_id
  and p.sku = seed_products.sku
where seed_context.tenant_id is not null
  and not exists (
    select 1
    from public.product_images i
    where i.product_id = p.id
      and i.url = seed_products.image_url
  );

commit;
