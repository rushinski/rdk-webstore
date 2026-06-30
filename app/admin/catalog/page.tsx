"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { logError } from "@/lib/utils/log";

import { AliasesTab } from "./components/AliasesTab";
import { BrandsTab } from "./components/BrandsTab";
import { CandidatesTab } from "./components/CandidatesTab";
import { CatalogToolbar } from "./components/CatalogToolbar";
import { TagModals } from "./components/TagModals";
import type {
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
} from "./types";

const tabs: Array<{ key: ActiveTab; label: string }> = [
  { key: "brands", label: "Tags" },
  { key: "aliases", label: "Aliases" },
  { key: "candidates", label: "Candidates" },
];

const emptyDraft = {
  brand: { label: "" },
  model: { brandId: "", label: "" },
  alias: {
    entityType: "brand" as "brand" | "model",
    entityId: "",
    label: "",
    priority: "0",
  },
};

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");

const toTitleCase = (value: string) =>
  normalizeWhitespace(value)
    .split(" ")
    .map((word) => {
      if (word.toUpperCase() === word) {
        return word;
      }
      if (word.toLowerCase() === word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ");

const normalizeLabel = (value: string) => normalizeWhitespace(value).toLowerCase();

const infoItems = [
  {
    label: "Brands",
    description: "Canonical brand labels used for products, filters, and parsing.",
  },
  {
    label: "Models",
    description:
      "Canonical sneaker model labels tied to a brand. Only used when category is sneakers.",
  },
  {
    label: "Aliases",
    description:
      "Alternate spellings or shorthand that map to brands or models and support parser matching.",
  },
  {
    label: "Alias Priority",
    description:
      "When multiple aliases match, higher priority wins over shorter or lower-priority matches.",
  },
  {
    label: "Candidates",
    description:
      "Unknown brands and models created during product entry. Accept them to add them to taxonomy.",
  },
  {
    label: "Verified",
    description:
      "Trusted entries that appear cleanly in storefront filters. Unverified is provisional.",
  },
  {
    label: "Active",
    description:
      "Active entries are used by the parser and UI. Inactive hides them without deleting.",
  },
  {
    label: "Title Parsing",
    description:
      "Titles are parsed into brand, model, and name. Brand is found first, then model for sneakers.",
  },
];

export default function TagsPage() {
  const [groups, setGroups] = useState<BrandGroup[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>("brands");
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showUnverified, setShowUnverified] = useState(true);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const [newBrand, setNewBrand] = useState(emptyDraft.brand);
  const [newModel, setNewModel] = useState(emptyDraft.model);
  const [newAlias, setNewAlias] = useState(emptyDraft.alias);

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<EditTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [modelTargetBrand, setModelTargetBrand] = useState<Brand | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (value: string) =>
    normalizedQuery.length === 0 || value.toLowerCase().includes(normalizedQuery);

  const brandMap = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand])),
    [brands],
  );
  const modelMap = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );

  const defaultGroupId = useMemo(() => {
    if (groups.length === 0) {
      return null;
    }

    const activeGroups = groups.filter((group) => group.is_active);
    const preferred =
      activeGroups.find((group) => group.key === "other") ?? activeGroups[0];

    return preferred?.id ?? groups[0]?.id ?? null;
  }, [groups]);

  const filteredModels = useMemo(
    () =>
      models.filter((model) => {
        if (!showInactive && !model.is_active) {
          return false;
        }
        if (!showUnverified && !model.is_verified) {
          return false;
        }

        const brandLabel = brandMap.get(model.brand_id)?.canonical_label ?? "";

        return matchesQuery(model.canonical_label) || matchesQuery(brandLabel);
      }),
    [models, showInactive, showUnverified, normalizedQuery, brandMap],
  );

  const filteredModelsByBrandId = useMemo(() => {
    const map: Record<string, Model[]> = {};

    filteredModels.forEach((model) => {
      if (!map[model.brand_id]) {
        map[model.brand_id] = [];
      }

      map[model.brand_id].push(model);
    });

    Object.keys(map).forEach((brandId) => {
      map[brandId].sort((left, right) =>
        left.canonical_label.localeCompare(right.canonical_label),
      );
    });

    return map;
  }, [filteredModels]);

  const filteredBrands = useMemo(
    () =>
      brands.filter((brand) => {
        if (!showInactive && !brand.is_active) {
          return false;
        }
        if (!showUnverified && !brand.is_verified) {
          return false;
        }

        const matchesBrand = matchesQuery(brand.canonical_label);
        const matchesModel = (filteredModelsByBrandId[brand.id]?.length ?? 0) > 0;

        return matchesBrand || matchesModel;
      }),
    [brands, showInactive, showUnverified, normalizedQuery, filteredModelsByBrandId],
  );

  const filteredAliases = useMemo(
    () =>
      aliases.filter((alias) => {
        if (!showInactive && !alias.is_active) {
          return false;
        }

        const targetLabel =
          alias.entity_type === "brand"
            ? (brandMap.get(alias.brand_id ?? "")?.canonical_label ?? "")
            : (modelMap.get(alias.model_id ?? "")?.canonical_label ?? "");

        return matchesQuery(alias.alias_label) || matchesQuery(targetLabel);
      }),
    [aliases, showInactive, normalizedQuery, brandMap, modelMap],
  );

  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        const brandLabel =
          brandMap.get(candidate.parent_brand_id ?? "")?.canonical_label ?? "";

        return matchesQuery(candidate.raw_text) || matchesQuery(brandLabel);
      }),
    [candidates, normalizedQuery, brandMap],
  );

  const loadAll = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const [
        groupsResponse,
        brandsResponse,
        modelsResponse,
        aliasesResponse,
        candidatesResponse,
      ] = await Promise.all([
        fetch("/api/admin/catalog/brand-groups?includeInactive=1"),
        fetch("/api/admin/catalog/brands?includeInactive=1"),
        fetch("/api/admin/catalog/models?includeInactive=1"),
        fetch("/api/admin/catalog/aliases?includeInactive=1"),
        fetch("/api/admin/catalog/candidates?status=new"),
      ]);

      const groupsData = await groupsResponse.json();
      const brandsData = await brandsResponse.json();
      const modelsData = await modelsResponse.json();
      const aliasesData = await aliasesResponse.json();
      const candidatesData = await candidatesResponse.json();

      setGroups(groupsData.groups || []);
      setBrands(brandsData.brands || []);
      setModels(modelsData.models || []);
      setAliases(aliasesData.aliases || []);
      setCandidates(candidatesData.candidates || []);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_catalog" });
      setMessage("Failed to load tag data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!editTarget) {
      setEditDraft(null);
      return;
    }

    if (editTarget.type === "brand") {
      const draft: BrandEditDraft = {
        canonical_label: editTarget.item.canonical_label,
        is_active: editTarget.item.is_active,
        is_verified: editTarget.item.is_verified,
      };
      setEditDraft(draft);
    }

    if (editTarget.type === "model") {
      const draft: ModelEditDraft = {
        canonical_label: editTarget.item.canonical_label,
        brand_id: editTarget.item.brand_id,
        is_active: editTarget.item.is_active,
        is_verified: editTarget.item.is_verified,
      };
      setEditDraft(draft);
    }

    if (editTarget.type === "alias") {
      const draft: AliasEditDraft = {
        alias_label: editTarget.item.alias_label,
        priority: editTarget.item.priority ?? 0,
        is_active: editTarget.item.is_active,
      };
      setEditDraft(draft);
    }
  }, [editTarget]);

  const toggleMenu = (key: string) => {
    setOpenMenuKey((current) => (current === key ? null : key));
  };

  const toggleBrandExpansion = (brandId: string) => {
    setExpandedBrands((current) => ({ ...current, [brandId]: !current[brandId] }));
  };

  const openAddBrandModal = () => {
    setNewBrand(emptyDraft.brand);
    setShowAddBrandModal(true);
  };

  const openAddModelModal = (brand: Brand) => {
    setModelTargetBrand(brand);
    setNewModel({ ...emptyDraft.model, brandId: brand.id });
    setShowAddModelModal(true);
  };

  const handleCreateBrand = async () => {
    if (!newBrand.label.trim()) {
      setMessage("Brand label is required.");
      return;
    }
    if (!defaultGroupId) {
      setMessage("Unable to create brand: missing default configuration.");
      return;
    }

    const formattedLabel = toTitleCase(newBrand.label);
    const normalized = normalizeLabel(formattedLabel);
    const isDuplicate = brands.some(
      (brand) => normalizeLabel(brand.canonical_label) === normalized,
    );

    if (isDuplicate) {
      setMessage("Brand already exists.");
      return;
    }

    const response = await fetch("/api/admin/catalog/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: defaultGroupId, canonicalLabel: formattedLabel }),
    });

    if (!response.ok) {
      setMessage("Failed to create brand.");
      return;
    }

    setNewBrand(emptyDraft.brand);
    setShowAddBrandModal(false);
    await loadAll();
  };

  const handleCreateModel = async () => {
    if (!newModel.brandId || !newModel.label.trim()) {
      setMessage("Brand and model label are required.");
      return;
    }

    const formattedLabel = toTitleCase(newModel.label);
    const normalized = normalizeLabel(formattedLabel);
    const isDuplicate = models.some(
      (model) =>
        model.brand_id === newModel.brandId &&
        normalizeLabel(model.canonical_label) === normalized,
    );

    if (isDuplicate) {
      setMessage("Model already exists for this brand.");
      return;
    }

    const response = await fetch("/api/admin/catalog/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId: newModel.brandId, canonicalLabel: formattedLabel }),
    });

    if (!response.ok) {
      setMessage("Failed to create model.");
      return;
    }

    setNewModel(emptyDraft.model);
    setShowAddModelModal(false);
    setModelTargetBrand(null);
    await loadAll();
  };

  const handleCreateAlias = async () => {
    if (!newAlias.label.trim() || !newAlias.entityId) {
      setMessage("Alias label and entity are required.");
      return;
    }

    const normalized = normalizeLabel(newAlias.label);
    const isDuplicate = aliases.some((alias) => {
      const targetId = alias.entity_type === "brand" ? alias.brand_id : alias.model_id;

      return (
        alias.entity_type === newAlias.entityType &&
        targetId === newAlias.entityId &&
        normalizeLabel(alias.alias_label) === normalized
      );
    });

    if (isDuplicate) {
      setMessage("Alias already exists for that item.");
      return;
    }

    const response = await fetch("/api/admin/catalog/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: newAlias.entityType,
        brandId: newAlias.entityType === "brand" ? newAlias.entityId : null,
        modelId: newAlias.entityType === "model" ? newAlias.entityId : null,
        aliasLabel: newAlias.label.trim(),
        priority: Number(newAlias.priority || 0),
      }),
    });

    if (!response.ok) {
      setMessage("Failed to create alias.");
      return;
    }

    setNewAlias(emptyDraft.alias);
    await loadAll();
  };

  const handleAcceptCandidate = async (candidate: Candidate) => {
    if (candidate.entity_type === "brand" && !defaultGroupId) {
      setMessage("Unable to accept brand candidate: missing default configuration.");
      return;
    }

    const payload =
      candidate.entity_type === "brand" && defaultGroupId
        ? { groupId: defaultGroupId }
        : {};
    const response = await fetch(`/api/admin/catalog/candidates/${candidate.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setMessage("Failed to accept candidate.");
      return;
    }

    await loadAll();
  };

  const handleRejectCandidate = async (candidate: Candidate) => {
    const response = await fetch(`/api/admin/catalog/candidates/${candidate.id}/reject`, {
      method: "POST",
    });

    if (!response.ok) {
      setMessage("Failed to reject candidate.");
      return;
    }

    await loadAll();
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !editDraft) {
      return;
    }

    setMessage("");

    if (editTarget.type === "brand") {
      const draft = editDraft as BrandEditDraft;
      const normalized = normalizeLabel(draft.canonical_label ?? "");

      if (!normalized) {
        setMessage("Brand label is required.");
        return;
      }

      const isDuplicate = brands.some(
        (brand) =>
          brand.id !== editTarget.item.id &&
          normalizeLabel(brand.canonical_label) === normalized,
      );

      if (isDuplicate) {
        setMessage("Brand already exists.");
        return;
      }
    }

    if (editTarget.type === "model") {
      const draft = editDraft as ModelEditDraft;
      const normalized = normalizeLabel(draft.canonical_label ?? "");

      if (!normalized || !draft.brand_id) {
        setMessage("Brand and model label are required.");
        return;
      }

      const isDuplicate = models.some(
        (model) =>
          model.id !== editTarget.item.id &&
          model.brand_id === draft.brand_id &&
          normalizeLabel(model.canonical_label) === normalized,
      );

      if (isDuplicate) {
        setMessage("Model already exists for this brand.");
        return;
      }
    }

    if (editTarget.type === "alias") {
      const draft = editDraft as AliasEditDraft;
      const normalized = normalizeLabel(draft.alias_label ?? "");

      if (!normalized) {
        setMessage("Alias label is required.");
        return;
      }

      const targetId =
        editTarget.item.entity_type === "brand"
          ? editTarget.item.brand_id
          : editTarget.item.model_id;
      const isDuplicate = aliases.some((alias) => {
        const aliasTargetId =
          alias.entity_type === "brand" ? alias.brand_id : alias.model_id;

        return (
          alias.id !== editTarget.item.id &&
          alias.entity_type === editTarget.item.entity_type &&
          aliasTargetId === targetId &&
          normalizeLabel(alias.alias_label) === normalized
        );
      });

      if (isDuplicate) {
        setMessage("Alias already exists for that item.");
        return;
      }
    }

    setIsSaving(true);

    try {
      if (editTarget.type === "brand") {
        const draft = editDraft as BrandEditDraft;
        await fetch(`/api/admin/catalog/brands/${editTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canonicalLabel: draft.canonical_label,
            isActive: draft.is_active,
            isVerified: draft.is_verified,
          }),
        });
      }

      if (editTarget.type === "model") {
        const draft = editDraft as ModelEditDraft;
        await fetch(`/api/admin/catalog/models/${editTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId: draft.brand_id,
            canonicalLabel: draft.canonical_label,
            isActive: draft.is_active,
            isVerified: draft.is_verified,
          }),
        });
      }

      if (editTarget.type === "alias") {
        const draft = editDraft as AliasEditDraft;
        await fetch(`/api/admin/catalog/aliases/${editTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aliasLabel: draft.alias_label,
            priority: draft.priority ?? 0,
            isActive: draft.is_active,
          }),
        });
      }

      await loadAll();
      setEditTarget(null);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_save_catalog_edit" });
      setMessage("Failed to update tag entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (confirmTarget.type === "brand") {
        await fetch(`/api/admin/catalog/brands/${confirmTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
      }

      if (confirmTarget.type === "model") {
        await fetch(`/api/admin/catalog/models/${confirmTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
      }

      if (confirmTarget.type === "alias") {
        await fetch(`/api/admin/catalog/aliases/${confirmTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
      }

      await loadAll();
      setConfirmTarget(null);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_delete_catalog" });
      setMessage("Failed to delete tag entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const resolveBrandLabel = (brandId?: string | null) =>
    brandMap.get(brandId ?? "")?.canonical_label || "Unknown";

  const resolveModelLabel = (modelId?: string | null) =>
    modelMap.get(modelId ?? "")?.canonical_label || "Unknown";

  const counts = {
    brands: filteredBrands.length,
    aliases: filteredAliases.length,
    candidates: filteredCandidates.length,
  } satisfies Record<ActiveTab, number>;

  return (
    <div
      className="space-y-6"
      onClick={() => {
        setOpenMenuKey(null);
      }}
    >
      <AdminPageHeader
        title="Catalog"
        description="Manage canonical tags, alias mappings, and parser candidates with a single shared admin workflow."
      />

      {message ? (
        <div className="border border-brand-border bg-brand-page px-4 py-3 text-sm text-brand-text">
          {message}
        </div>
      ) : null}

      <AdminSectionCard title="Info Key">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between border border-brand-border bg-brand-page px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-text">
            <span>How The Catalog System Works</span>
            <span className="text-xs text-brand-muted group-open:hidden">Show</span>
            <span className="hidden text-xs text-brand-muted group-open:inline">
              Hide
            </span>
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {infoItems.map((item) => (
              <div
                key={item.label}
                className="border border-brand-border bg-brand-page p-3"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-muted">
                  {item.label}
                </div>
                <div className="mt-1 text-sm text-brand-text">{item.description}</div>
              </div>
            ))}
          </div>
        </details>
      </AdminSectionCard>

      <CatalogToolbar
        activeTab={activeTab}
        tabs={tabs}
        query={query}
        showInactive={showInactive}
        showUnverified={showUnverified}
        counts={counts}
        onTabChange={setActiveTab}
        onQueryChange={setQuery}
        onShowInactiveChange={setShowInactive}
        onShowUnverifiedChange={setShowUnverified}
      />

      {activeTab === "brands" ? (
        <BrandsTab
          isLoading={isLoading}
          brands={filteredBrands}
          filteredModelsByBrandId={filteredModelsByBrandId}
          expandedBrands={expandedBrands}
          openMenuKey={openMenuKey}
          onToggleBrandExpansion={toggleBrandExpansion}
          onToggleMenu={toggleMenu}
          onOpenAddBrand={openAddBrandModal}
          onOpenAddModel={openAddModelModal}
          onEditBrand={(brand) => setEditTarget({ type: "brand", item: brand })}
          onDeleteBrand={(brand) => setConfirmTarget({ type: "brand", item: brand })}
          onEditModel={(model) => setEditTarget({ type: "model", item: model })}
          onDeleteModel={(model) => setConfirmTarget({ type: "model", item: model })}
        />
      ) : null}

      {activeTab === "aliases" ? (
        <AliasesTab
          isLoading={isLoading}
          aliases={filteredAliases}
          brands={brands}
          models={models}
          newAlias={newAlias}
          openMenuKey={openMenuKey}
          onToggleMenu={toggleMenu}
          onNewAliasChange={setNewAlias}
          onCreateAlias={() => {
            void handleCreateAlias();
          }}
          onEditAlias={(alias) => setEditTarget({ type: "alias", item: alias })}
          onDeleteAlias={(alias) => setConfirmTarget({ type: "alias", item: alias })}
          resolveBrandLabel={resolveBrandLabel}
          resolveModelLabel={resolveModelLabel}
        />
      ) : null}

      {activeTab === "candidates" ? (
        <CandidatesTab
          isLoading={isLoading}
          candidates={filteredCandidates}
          onAcceptCandidate={(candidate) => {
            void handleAcceptCandidate(candidate);
          }}
          onRejectCandidate={(candidate) => {
            void handleRejectCandidate(candidate);
          }}
          resolveBrandLabel={resolveBrandLabel}
        />
      ) : null}

      <TagModals
        showAddBrandModal={showAddBrandModal}
        showAddModelModal={showAddModelModal}
        editTarget={editTarget}
        editDraft={editDraft}
        confirmTarget={confirmTarget}
        isSaving={isSaving}
        brands={brands}
        modelTargetBrand={modelTargetBrand}
        newBrand={newBrand}
        newModel={newModel}
        setNewBrand={setNewBrand}
        setNewModel={setNewModel}
        setShowAddBrandModal={setShowAddBrandModal}
        setShowAddModelModal={setShowAddModelModal}
        setModelTargetBrand={setModelTargetBrand}
        setEditTarget={setEditTarget}
        setEditDraft={setEditDraft}
        setConfirmTarget={setConfirmTarget}
        onCreateBrand={() => {
          void handleCreateBrand();
        }}
        onCreateModel={() => {
          void handleCreateModel();
        }}
        onSaveEdit={() => {
          void handleSaveEdit();
        }}
        onConfirmDelete={() => {
          void handleConfirmDelete();
        }}
        toTitleCase={toTitleCase}
      />
    </div>
  );
}
