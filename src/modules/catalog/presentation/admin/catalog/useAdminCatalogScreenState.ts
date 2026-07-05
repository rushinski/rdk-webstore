"use client";

import { useEffect, useState } from "react";

import { buildCatalogEditDraft } from "@/components/admin/catalog/catalogEditState";
import { emptyCatalogDraft } from "@/components/admin/catalog/catalogConfig";
import type {
  ActiveTab,
  Brand,
  EditDraft,
  EditTarget,
  NewAliasDraft,
} from "@/components/admin/catalog/types";

export function useAdminCatalogScreenState(params: {
  editTarget: EditTarget | null;
  loadAll: () => Promise<void>;
}) {
  const { editTarget, loadAll } = params;

  const [activeTab, setActiveTab] = useState<ActiveTab>("brands");
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showUnverified, setShowUnverified] = useState(true);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const [newBrand, setNewBrand] = useState(emptyCatalogDraft.brand);
  const [newModel, setNewModel] = useState(emptyCatalogDraft.model);
  const [newAlias, setNewAlias] = useState<NewAliasDraft>(emptyCatalogDraft.alias);

  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<EditTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [modelTargetBrand, setModelTargetBrand] = useState<Brand | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!editTarget) {
      setEditDraft(null);
      return;
    }

    setEditDraft(buildCatalogEditDraft(editTarget));
  }, [editTarget]);

  const toggleMenu = (key: string) => {
    setOpenMenuKey((current) => (current === key ? null : key));
  };

  const toggleBrandExpansion = (brandId: string) => {
    setExpandedBrands((current) => ({ ...current, [brandId]: !current[brandId] }));
  };

  const openAddBrandModal = () => {
    setNewBrand(emptyCatalogDraft.brand);
    setShowAddBrandModal(true);
  };

  const openAddModelModal = (brand: Brand) => {
    setModelTargetBrand(brand);
    setNewModel({ ...emptyCatalogDraft.model, brandId: brand.id });
    setShowAddModelModal(true);
  };

  return {
    activeTab,
    confirmTarget,
    editDraft,
    expandedBrands,
    isSaving,
    modelTargetBrand,
    newAlias,
    newBrand,
    newModel,
    openMenuKey,
    query,
    setActiveTab,
    setConfirmTarget,
    setEditDraft,
    setExpandedBrands,
    setIsSaving,
    setModelTargetBrand,
    setNewAlias,
    setNewBrand,
    setNewModel,
    setOpenMenuKey,
    setQuery,
    setShowAddBrandModal,
    setShowAddModelModal,
    setShowInactive,
    setShowUnverified,
    showAddBrandModal,
    showAddModelModal,
    showInactive,
    showUnverified,
    toggleBrandExpansion,
    toggleMenu,
    openAddBrandModal,
    openAddModelModal,
  };
}
