// src/types/product.ts

export type SizeType = 'shoe' | 'clothing' | 'custom' | 'none';
export type Category = 'sneakers' | 'clothing' | 'accessories' | 'electronics';
export type Condition = 'new' | 'used';
export type TagGroupKey = 'brand' | 'size_shoe' | 'size_clothing' | 'size_custom' | 'size_none' | 'condition' | 'category';

export interface Product {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  brand: string;
  name: string;
  category: Category;
  condition: Condition;
  condition_note: string | null;
  description: string | null;
  sku: string;
  cost_cents: number;
  shipping_override_cents: number | null;
  is_active: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size_type: SizeType;
  size_label: string;
  price_cents: number;
  stock: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

export interface Tag {
  id: string;
  label: string;
  group_key: TagGroupKey;
}

export interface ProductTag {
  product_id: string;
  tag_id: string;
}

export interface ProductWithDetails extends Product {
  variants: ProductVariant[];
  images: ProductImage[];
  tags: Tag[];
}

export interface ShippingProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  updated_at: string;
}

export interface CartItem {
  productId: string;
  variantId: string;
  sizeLabel: string;
  brand: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  quantity: number;
}

export const SHOE_SIZES = [
  '3.5Y / 5W',
  '4Y / 5.5W',
  '4.5Y / 6W',
  '5Y / 6.5W',
  '5.5Y / 7W',
  '6Y / 7.5W',
  '6.5Y / 8W',
  '7Y / 8.5W',
  '7.5M / 9W',
  '8M / 9.5W',
  '8.5M / 10W',
  '9M / 10.5W',
  '9.5M / 11W',
  '10M / 11.5W',
  '10.5M / 12W',
  '11M / 12.5W',
  '11.5M / 13W',
  '12M / 13.5W',
  '12.5M / 14W',
  '13M / 14.5W',
  '13.5M / 15W',
  '14M / 15.5W',
  '15M / 16M',
];

export const CLOTHING_SIZES = [
  'XS',
  'SMALL',
  'MEDIUM',
  'LARGE',
  'XL',
  '2XL / 3XL',
];