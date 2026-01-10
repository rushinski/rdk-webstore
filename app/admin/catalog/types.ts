export type BrandGroup = {
  id: string;
  key: string;
  label: string;
  is_active: boolean;
};

export type Brand = {
  id: string;
  group_id: string;
  canonical_label: string;
  is_active: boolean;
  is_verified: boolean;
  group?: { id: string; key: string; label: string };
};

export type Model = {
  id: string;
  brand_id: string;
  canonical_label: string;
  is_active: boolean;
  is_verified: boolean;
};

export type Alias = {
  id: string;
  entity_type: "brand" | "model";
  brand_id: string | null;
  model_id: string | null;
  alias_label: string;
  priority: number;
  is_active: boolean;
};

export type Candidate = {
  id: string;
  entity_type: "brand" | "model";
  raw_text: string;
  parent_brand_id: string | null;
  status: string;
};

export type ActiveTab = "brands" | "aliases" | "candidates";

export type EditTarget =
  | { type: "brand"; item: Brand }
  | { type: "model"; item: Model }
  | { type: "alias"; item: Alias };
