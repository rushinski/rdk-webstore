import type { ProductFormImageInput } from "../productEditorTypes";

export type VariantDraft = {
  draft_id: string;
  id?: string;
  sku: string;
  size_label: string;
  salePrice: string;
  unitCost: string;
  stock: string;
};

export type ImageDraft = ProductFormImageInput;

export type CatalogOption = {
  id: string;
  label: string;
  groupKey?: string | null;
};

export type ParseStatus = "idle" | "loading" | "error";

export type PublishMode = "immediately" | "scheduled";

export type UploadQueueState = {
  total: number;
  completed: number;
  failed: number;
  isUploading: boolean;
  currentStatus?: string;
};
