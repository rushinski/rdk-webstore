-- database-optimizations.sql
-- Run this SQL to add performance indexes for the inventory pages

-- ============================================
-- CATALOG PERFORMANCE INDEXES
-- ============================================

-- Speed up brand lookups by label
CREATE INDEX IF NOT EXISTS idx_catalog_brands_label 
  ON catalog_brands(canonical_label);

-- Speed up tenant-scoped brand queries
CREATE INDEX IF NOT EXISTS idx_catalog_brands_tenant 
  ON catalog_brands(tenant_id)
  WHERE tenant_id IS NOT NULL;

-- Speed up brand group lookups
CREATE INDEX IF NOT EXISTS idx_catalog_brands_group 
  ON catalog_brands(group_id)
  WHERE group_id IS NOT NULL;

-- Speed up model lookups by brand
CREATE INDEX IF NOT EXISTS idx_catalog_models_brand 
  ON catalog_models(brand_id);

-- Speed up model lookups by label
CREATE INDEX IF NOT EXISTS idx_catalog_models_label 
  ON catalog_models(canonical_label);

-- Speed up tenant-scoped model queries
CREATE INDEX IF NOT EXISTS idx_catalog_models_tenant 
  ON catalog_models(tenant_id)
  WHERE tenant_id IS NOT NULL;

-- ============================================
-- PRODUCT PERFORMANCE INDEXES
-- ============================================

-- Composite index for active products by tenant
-- This is used heavily in inventory list
CREATE INDEX IF NOT EXISTS idx_products_tenant_active 
  ON products(tenant_id, is_active) 
  WHERE is_active = true;

-- Composite index for filtering by stock status
CREATE INDEX IF NOT EXISTS idx_products_tenant_stock 
  ON products(tenant_id, is_out_of_stock, is_active)
  WHERE is_active = true;

-- Speed up title searches
CREATE INDEX IF NOT EXISTS idx_products_title_search 
  ON products USING gin(to_tsvector('english', title_raw || ' ' || title_display));

-- Speed up brand + category filtering
CREATE INDEX IF NOT EXISTS idx_products_brand_category 
  ON products(brand, category, is_active)
  WHERE is_active = true;

-- ============================================
-- VARIANT PERFORMANCE INDEXES
-- ============================================

-- Speed up variant lookups by product
-- (Already exists: idx_product_variants_product_id)

-- Composite index for stock availability queries
CREATE INDEX IF NOT EXISTS idx_variants_product_stock 
  ON product_variants(product_id, stock)
  WHERE stock > 0;

-- Speed up price sorting
CREATE INDEX IF NOT EXISTS idx_variants_product_price 
  ON product_variants(product_id, price_cents);

-- Speed up size filtering
CREATE INDEX IF NOT EXISTS idx_variants_size_stock 
  ON product_variants(size_type, size_label, stock)
  WHERE stock > 0;

-- ============================================
-- IMAGE PERFORMANCE INDEXES
-- ============================================

-- Composite index for primary image lookups
CREATE INDEX IF NOT EXISTS idx_images_product_primary 
  ON product_images(product_id, is_primary, sort_order);

-- ============================================
-- TAG PERFORMANCE INDEXES
-- ============================================

-- Speed up tag lookups by tenant and label
CREATE INDEX IF NOT EXISTS idx_tags_tenant_label 
  ON tags(tenant_id, label, group_key);

-- Speed up product tag joins
CREATE INDEX IF NOT EXISTS idx_product_tags_composite 
  ON product_tags(product_id, tag_id);

-- ============================================
-- ANALYZE TABLES
-- ============================================

-- Update statistics for query planner
ANALYZE products;
ANALYZE product_variants;
ANALYZE product_images;
ANALYZE product_tags;
ANALYZE tags;
ANALYZE catalog_brands;
ANALYZE catalog_models;

-- ============================================
-- VERIFY INDEXES
-- ============================================

-- Run this to see all indexes on products table:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'products';

-- Run this to see index usage statistics:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;