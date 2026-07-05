export { AdminCatalogScreen } from "@/modules/catalog/presentation/admin/catalog/AdminCatalogScreen";
export { CatalogInfoKey } from "@/modules/catalog/presentation/admin/catalog/CatalogInfoKey";
export { CatalogTabContent } from "@/modules/catalog/presentation/admin/catalog/CatalogTabContent";
export {
  catalogTabs,
  emptyCatalogDraft,
  normalizeLabel,
  normalizeWhitespace,
  toTitleCase,
} from "@/modules/catalog/presentation/admin/catalog/catalogConfig";
export { buildCatalogEditDraft } from "@/modules/catalog/presentation/admin/catalog/catalogEditState";
export type {
  ActiveTab,
  Alias,
  AliasEditDraft,
  Brand,
  BrandEditDraft,
  BrandGroup,
  Candidate,
  EditDraft,
  EditTarget,
  Model,
  ModelEditDraft,
  NewAliasDraft,
} from "@/modules/catalog/presentation/admin/catalog/types";
export { useAdminCatalogData } from "@/modules/catalog/presentation/admin/catalog/useAdminCatalogData";
export { useAdminCatalogDerivedState } from "@/modules/catalog/presentation/admin/catalog/useAdminCatalogDerivedState";
export { useAdminCatalogMutations } from "@/modules/catalog/presentation/admin/catalog/useAdminCatalogMutations";
export { useAdminCatalogScreenState } from "@/modules/catalog/presentation/admin/catalog/useAdminCatalogScreenState";
