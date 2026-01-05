'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, MoreVertical, Search } from 'lucide-react';
import { logError } from '@/lib/log';

type BrandGroup = {
  id: string;
  key: string;
  label: string;
  is_active: boolean;
};

type Brand = {
  id: string;
  group_id: string;
  canonical_label: string;
  is_active: boolean;
  is_verified: boolean;
  group?: { id: string; key: string; label: string };
};

type Model = {
  id: string;
  brand_id: string;
  canonical_label: string;
  is_active: boolean;
  is_verified: boolean;
};

type Alias = {
  id: string;
  entity_type: 'brand' | 'model';
  brand_id: string | null;
  model_id: string | null;
  alias_label: string;
  priority: number;
  is_active: boolean;
};

type Candidate = {
  id: string;
  entity_type: 'brand' | 'model';
  raw_text: string;
  parent_brand_id: string | null;
  status: string;
};

type ActiveTab = 'brands' | 'aliases' | 'candidates';

type EditTarget =
  | { type: 'brand'; item: Brand }
  | { type: 'model'; item: Model }
  | { type: 'alias'; item: Alias };

const tabs: Array<{ key: ActiveTab; label: string }> = [
  { key: 'brands', label: 'Tags' },
  { key: 'aliases', label: 'Aliases' },
  { key: 'candidates', label: 'Candidates' },
];

const emptyDraft = {
  brand: { label: '' },
  model: { brandId: '', label: '' },
  alias: { entityType: 'brand' as 'brand' | 'model', entityId: '', label: '', priority: '0' },
};

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

const toTitleCase = (value: string) =>
  normalizeWhitespace(value)
    .split(' ')
    .map((word) => {
      if (word.toUpperCase() === word) return word;
      if (word.toLowerCase() === word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');

const normalizeLabel = (value: string) => normalizeWhitespace(value).toLowerCase();

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
        active ? 'bg-emerald-500/10 text-emerald-200' : 'bg-zinc-800 text-gray-400'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function VerifiedPill({ verified }: { verified: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
        verified ? 'bg-blue-500/10 text-blue-200' : 'bg-zinc-800 text-gray-400'
      }`}
    >
      {verified ? 'Verified' : 'Unverified'}
    </span>
  );
}

export default function TagsPage() {
  const [groups, setGroups] = useState<BrandGroup[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('brands');
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showUnverified, setShowUnverified] = useState(true);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const [newBrand, setNewBrand] = useState(emptyDraft.brand);
  const [newModel, setNewModel] = useState(emptyDraft.model);
  const [newAlias, setNewAlias] = useState(emptyDraft.alias);

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);
  const [confirmTarget, setConfirmTarget] = useState<EditTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [modelTargetBrand, setModelTargetBrand] = useState<Brand | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (value: string) =>
    normalizedQuery.length === 0 || value.toLowerCase().includes(normalizedQuery);

  const brandMap = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);
  const modelMap = useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);

  const defaultGroupId = useMemo(() => {
    if (groups.length === 0) return null;
    const activeGroups = groups.filter((group) => group.is_active);
    const preferred = activeGroups.find((group) => group.key === 'other') ?? activeGroups[0];
    return preferred?.id ?? groups[0]?.id ?? null;
  }, [groups]);

  const filteredModels = useMemo(
    () =>
      models.filter((model) => {
        if (!showInactive && !model.is_active) return false;
        if (!showUnverified && !model.is_verified) return false;
        const brandLabel = brandMap.get(model.brand_id)?.canonical_label ?? '';
        if (!matchesQuery(model.canonical_label) && !matchesQuery(brandLabel)) return false;
        return true;
      }),
    [models, showInactive, showUnverified, normalizedQuery, brandMap]
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
      map[brandId].sort((a, b) => a.canonical_label.localeCompare(b.canonical_label));
    });
    return map;
  }, [filteredModels]);

  const filteredBrands = useMemo(
    () =>
      brands.filter((brand) => {
        if (!showInactive && !brand.is_active) return false;
        if (!showUnverified && !brand.is_verified) return false;
        const matchesBrand = matchesQuery(brand.canonical_label);
        const matchesModel = (filteredModelsByBrandId[brand.id]?.length ?? 0) > 0;
        if (!matchesBrand && !matchesModel) return false;
        return true;
      }),
    [brands, showInactive, showUnverified, normalizedQuery, filteredModelsByBrandId]
  );

  const filteredAliases = useMemo(
    () =>
      aliases.filter((alias) => {
        if (!showInactive && !alias.is_active) return false;
        const targetLabel =
          alias.entity_type === 'brand'
            ? brandMap.get(alias.brand_id ?? '')?.canonical_label ?? ''
            : modelMap.get(alias.model_id ?? '')?.canonical_label ?? '';
        if (!matchesQuery(alias.alias_label) && !matchesQuery(targetLabel)) return false;
        return true;
      }),
    [aliases, showInactive, normalizedQuery, brandMap, modelMap]
  );

  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        const brandLabel = brandMap.get(candidate.parent_brand_id ?? '')?.canonical_label ?? '';
        if (!matchesQuery(candidate.raw_text) && !matchesQuery(brandLabel)) return false;
        return true;
      }),
    [candidates, normalizedQuery, brandMap]
  );

  const loadAll = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const [groupsRes, brandsRes, modelsRes, aliasesRes, candidatesRes] = await Promise.all([
        fetch('/api/admin/catalog/brand-groups?includeInactive=1'),
        fetch('/api/admin/catalog/brands?includeInactive=1'),
        fetch('/api/admin/catalog/models?includeInactive=1'),
        fetch('/api/admin/catalog/aliases?includeInactive=1'),
        fetch('/api/admin/catalog/candidates?status=new'),
      ]);

      const groupsData = await groupsRes.json();
      const brandsData = await brandsRes.json();
      const modelsData = await modelsRes.json();
      const aliasesData = await aliasesRes.json();
      const candidatesData = await candidatesRes.json();

      setGroups(groupsData.groups || []);
      setBrands(brandsData.brands || []);
      setModels(modelsData.models || []);
      setAliases(aliasesData.aliases || []);
      setCandidates(candidatesData.candidates || []);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_catalog" });
      setMessage('Failed to load tag data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!editTarget) {
      setEditDraft(null);
      return;
    }

    if (editTarget.type === 'brand') {
      setEditDraft({
        canonical_label: editTarget.item.canonical_label,
        is_active: editTarget.item.is_active,
        is_verified: editTarget.item.is_verified,
      });
    }
    if (editTarget.type === 'model') {
      setEditDraft({
        canonical_label: editTarget.item.canonical_label,
        brand_id: editTarget.item.brand_id,
        is_active: editTarget.item.is_active,
        is_verified: editTarget.item.is_verified,
      });
    }
    if (editTarget.type === 'alias') {
      setEditDraft({
        alias_label: editTarget.item.alias_label,
        priority: editTarget.item.priority ?? 0,
        is_active: editTarget.item.is_active,
      });
    }
  }, [editTarget]);

  const toggleMenu = (key: string) => {
    setOpenMenuKey((prev) => (prev === key ? null : key));
  };

  const toggleBrandExpansion = (brandId: string) => {
    setExpandedBrands((prev) => ({ ...prev, [brandId]: !prev[brandId] }));
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
      setMessage('Brand label is required.');
      return;
    }
    if (!defaultGroupId) {
      setMessage('Unable to create brand: missing default configuration.');
      return;
    }
    const formattedLabel = toTitleCase(newBrand.label);
    const normalizedLabel = normalizeLabel(formattedLabel);
    const isDuplicate = brands.some(
      (brand) => normalizeLabel(brand.canonical_label) === normalizedLabel
    );
    if (isDuplicate) {
      setMessage('Brand already exists.');
      return;
    }
    const response = await fetch('/api/admin/catalog/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: defaultGroupId, canonicalLabel: formattedLabel }),
    });
    if (response.ok) {
      setNewBrand(emptyDraft.brand);
      setShowAddBrandModal(false);
      await loadAll();
    } else {
      setMessage('Failed to create brand.');
    }
  };

  const handleCreateModel = async () => {
    if (!newModel.brandId || !newModel.label.trim()) {
      setMessage('Brand and model label are required.');
      return;
    }
    const formattedLabel = toTitleCase(newModel.label);
    const normalizedLabel = normalizeLabel(formattedLabel);
    const isDuplicate = models.some(
      (model) =>
        model.brand_id === newModel.brandId &&
        normalizeLabel(model.canonical_label) === normalizedLabel
    );
    if (isDuplicate) {
      setMessage('Model already exists for this brand.');
      return;
    }
    const response = await fetch('/api/admin/catalog/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: newModel.brandId, canonicalLabel: formattedLabel }),
    });
    if (response.ok) {
      setNewModel(emptyDraft.model);
      setShowAddModelModal(false);
      setModelTargetBrand(null);
      await loadAll();
    } else {
      setMessage('Failed to create model.');
    }
  };

  const handleCreateAlias = async () => {
    if (!newAlias.label.trim() || !newAlias.entityId) {
      setMessage('Alias label and entity are required.');
      return;
    }
    const normalizedLabel = normalizeLabel(newAlias.label);
    const isDuplicate = aliases.some((alias) => {
      const targetId = alias.entity_type === 'brand' ? alias.brand_id : alias.model_id;
      return (
        alias.entity_type === newAlias.entityType &&
        targetId === newAlias.entityId &&
        normalizeLabel(alias.alias_label) === normalizedLabel
      );
    });
    if (isDuplicate) {
      setMessage('Alias already exists for that item.');
      return;
    }
    const response = await fetch('/api/admin/catalog/aliases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: newAlias.entityType,
        brandId: newAlias.entityType === 'brand' ? newAlias.entityId : null,
        modelId: newAlias.entityType === 'model' ? newAlias.entityId : null,
        aliasLabel: newAlias.label.trim(),
        priority: Number(newAlias.priority || 0),
      }),
    });
    if (response.ok) {
      setNewAlias(emptyDraft.alias);
      await loadAll();
    } else {
      setMessage('Failed to create alias.');
    }
  };

  const handleAcceptCandidate = async (candidate: Candidate) => {
    if (candidate.entity_type === 'brand' && !defaultGroupId) {
      setMessage('Unable to accept brand candidate: missing default configuration.');
      return;
    }
    const payload =
      candidate.entity_type === 'brand' && defaultGroupId ? { groupId: defaultGroupId } : {};
    const response = await fetch(`/api/admin/catalog/candidates/${candidate.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      await loadAll();
    } else {
      setMessage('Failed to accept candidate.');
    }
  };

  const handleRejectCandidate = async (candidate: Candidate) => {
    const response = await fetch(`/api/admin/catalog/candidates/${candidate.id}/reject`, {
      method: 'POST',
    });
    if (response.ok) {
      await loadAll();
    } else {
      setMessage('Failed to reject candidate.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !editDraft) return;
    setMessage('');
    if (editTarget.type === 'brand') {
      const normalizedLabel = normalizeLabel(editDraft.canonical_label ?? '');
      if (!normalizedLabel) {
        setMessage('Brand label is required.');
        return;
      }
      const isDuplicate = brands.some(
        (brand) =>
          brand.id !== editTarget.item.id &&
          normalizeLabel(brand.canonical_label) === normalizedLabel
      );
      if (isDuplicate) {
        setMessage('Brand already exists.');
        return;
      }
    }

    if (editTarget.type === 'model') {
      const normalizedLabel = normalizeLabel(editDraft.canonical_label ?? '');
      if (!normalizedLabel || !editDraft.brand_id) {
        setMessage('Brand and model label are required.');
        return;
      }
      const isDuplicate = models.some(
        (model) =>
          model.id !== editTarget.item.id &&
          model.brand_id === editDraft.brand_id &&
          normalizeLabel(model.canonical_label) === normalizedLabel
      );
      if (isDuplicate) {
        setMessage('Model already exists for this brand.');
        return;
      }
    }

    if (editTarget.type === 'alias') {
      const normalizedLabel = normalizeLabel(editDraft.alias_label ?? '');
      if (!normalizedLabel) {
        setMessage('Alias label is required.');
        return;
      }
      const targetId =
        editTarget.item.entity_type === 'brand'
          ? editTarget.item.brand_id
          : editTarget.item.model_id;
      const isDuplicate = aliases.some((alias) => {
        const aliasTargetId = alias.entity_type === 'brand' ? alias.brand_id : alias.model_id;
        return (
          alias.id !== editTarget.item.id &&
          alias.entity_type === editTarget.item.entity_type &&
          aliasTargetId === targetId &&
          normalizeLabel(alias.alias_label) === normalizedLabel
        );
      });
      if (isDuplicate) {
      setMessage('Alias already exists for that item.');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (editTarget.type === 'brand') {
        await fetch(`/api/admin/catalog/brands/${editTarget.item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canonicalLabel: editDraft.canonical_label,
            isActive: editDraft.is_active,
            isVerified: editDraft.is_verified,
          }),
        });
      }

      if (editTarget.type === 'model') {
        await fetch(`/api/admin/catalog/models/${editTarget.item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId: editDraft.brand_id,
            canonicalLabel: editDraft.canonical_label,
            isActive: editDraft.is_active,
            isVerified: editDraft.is_verified,
          }),
        });
      }

      if (editTarget.type === 'alias') {
        await fetch(`/api/admin/catalog/aliases/${editTarget.item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aliasLabel: editDraft.alias_label,
            priority: editDraft.priority ?? 0,
            isActive: editDraft.is_active,
          }),
        });
      }

      await loadAll();
      setEditTarget(null);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_save_catalog_edit" });
      setMessage('Failed to update tag entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    setIsSaving(true);
    setMessage('');
    try {
      if (confirmTarget.type === 'brand') {
        await fetch(`/api/admin/catalog/brands/${confirmTarget.item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        });
      }
      if (confirmTarget.type === 'model') {
        await fetch(`/api/admin/catalog/models/${confirmTarget.item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        });
      }
      if (confirmTarget.type === 'alias') {
        await fetch(`/api/admin/catalog/aliases/${confirmTarget.item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        });
      }
      await loadAll();
      setConfirmTarget(null);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_delete_catalog" });
      setMessage('Failed to delete tag entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const resolveBrandLabel = (brandId?: string | null) =>
    brandMap.get(brandId ?? '')?.canonical_label || 'Unknown';

  const resolveModelLabel = (modelId?: string | null) =>
    modelMap.get(modelId ?? '')?.canonical_label || 'Unknown';

  const renderMenu = (key: string, onEdit: () => void, onDelete: () => void) => (
    <div
      className="relative"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={() => toggleMenu(key)}
        className="text-gray-400 hover:text-white p-1"
        aria-label="Open actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {openMenuKey === key && (
        <div className="absolute right-0 mt-2 w-40 bg-zinc-950 border border-zinc-800/70 shadow-xl z-30">
          <button
            type="button"
            onClick={() => {
              setOpenMenuKey(null);
              onEdit();
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-zinc-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setOpenMenuKey(null);
              onDelete();
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-800"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="space-y-6"
      onClick={() => {
        setOpenMenuKey(null);
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Tags Manager</h1>
          <p className="text-gray-400">
            Verified means the brand or model is confirmed and trusted for storefront filters. Unverified entries are
            allowed but treated as provisional.
          </p>
        </div>
      </div>

      {message && <div className="text-sm text-gray-400">{message}</div>}

      <div className="bg-zinc-900 border border-zinc-800/70 p-5">
        <details className="group">
          <summary className="cursor-pointer list-none text-sm text-gray-200 font-semibold flex items-center justify-between bg-zinc-950/60 border border-zinc-800/70 px-4 py-3">
            <span>Info key: how the tags system works</span>
            <span className="text-xs text-gray-500 group-open:hidden">Show</span>
            <span className="text-xs text-gray-500 hidden group-open:inline">Hide</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm text-gray-300">
            <div className="bg-zinc-950/50 border border-zinc-800/70 border-l-2 border-l-red-600 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Brands</div>
              <div>Canonical brand labels used for products, filters, and parsing.</div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800/70 border-l-2 border-l-red-600 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Models</div>
              <div>Canonical sneaker model labels tied to a brand. Only used when category is sneakers.</div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800/70 border-l-2 border-l-red-600 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Aliases</div>
              <div>Alternate spellings or shorthand that map to brands/models. Used by the parser.</div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800/70 border-l-2 border-l-red-600 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Alias Priority</div>
              <div>When multiple aliases match, higher priority wins over shorter or lower-priority matches.</div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800/70 border-l-2 border-l-red-600 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Candidates</div>
              <div>Unknown brands/models created during product entry. Review and accept to add them.</div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800/70 border-l-2 border-l-red-600 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Verified</div>
              <div>Trusted entries that appear cleanly in storefront filters. Unverified is provisional.</div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800/70 border-l-2 border-l-red-600 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Active</div>
              <div>Active entries are used by the parser and UI. Inactive hides them without deleting.</div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800/70 border-l-2 border-l-red-600 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Title Parsing</div>
              <div>
                Full titles are parsed into brand, model, and name. Brand is found first, then model
                (sneakers only), and the remainder becomes the name.
              </div>
            </div>
          </div>
        </details>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/70 px-3 py-2 w-full lg:max-w-md">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rdk-checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rdk-checkbox"
                checked={showUnverified}
                onChange={(e) => setShowUnverified(e.target.checked)}
              />
              Show unverified
            </label>
          </div>
        </div>

        <div className="border-b border-zinc-800/70 flex flex-wrap gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'text-white border-red-600'
                  : 'text-gray-400 hover:text-white border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'brands' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Tags</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{filteredBrands.length} brands</span>
              <button
                type="button"
                onClick={openAddBrandModal}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded text-sm"
              >
                Add Brands
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : filteredBrands.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No tags found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/70 bg-zinc-800">
                    <th className="text-left text-gray-400 font-semibold p-4">Brand</th>
                    <th className="text-left text-gray-400 font-semibold p-4">Status</th>
                    <th className="text-left text-gray-400 font-semibold p-4">Verified</th>
                    <th className="text-right text-gray-400 font-semibold p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBrands.map((brand) => {
                    const visibleModels = filteredModelsByBrandId[brand.id] ?? [];
                    const isExpanded = expandedBrands[brand.id] ?? false;
                    return (
                      <Fragment key={brand.id}>
                        <tr className="border-b border-zinc-800/70 hover:bg-zinc-800/60">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleBrandExpansion(brand.id)}
                                className="text-gray-400 hover:text-white"
                                aria-label={`Toggle ${brand.canonical_label} models`}
                              >
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                              <div>
                                <div className="text-white font-semibold">{brand.canonical_label}</div>
                                <div className="text-xs text-gray-500">
                                  {visibleModels.length} model{visibleModels.length === 1 ? '' : 's'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <StatusPill active={brand.is_active} />
                          </td>
                          <td className="p-4">
                            <VerifiedPill verified={brand.is_verified} />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openAddModelModal(brand)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold px-3 py-2 rounded"
                              >
                                Add Model
                              </button>
                              {renderMenu(
                                `brand-${brand.id}`,
                                () => setEditTarget({ type: 'brand', item: brand }),
                                () => setConfirmTarget({ type: 'brand', item: brand })
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-zinc-800/70 bg-zinc-900/40">
                            <td className="p-4" colSpan={4}>
                              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                                Models
                              </div>
                              {visibleModels.length === 0 ? (
                                <div className="text-xs text-gray-500">No models found.</div>
                              ) : (
                                <div className="space-y-2">
                                  {visibleModels.map((model) => (
                                    <div
                                      key={model.id}
                                      className="flex items-center justify-between gap-3 border border-zinc-800/70 rounded px-3 py-2 bg-zinc-900/60"
                                    >
                                      <div className="text-white text-sm">{model.canonical_label}</div>
                                      <div className="flex items-center gap-2">
                                        <StatusPill active={model.is_active} />
                                        <VerifiedPill verified={model.is_verified} />
                                        {renderMenu(
                                          `model-${model.id}`,
                                          () => setEditTarget({ type: 'model', item: model }),
                                          () => setConfirmTarget({ type: 'model', item: model })
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {activeTab === 'aliases' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Aliases</h2>
            <span className="text-xs text-gray-500">{filteredAliases.length} aliases</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={newAlias.entityType}
                onChange={(e) =>
                  setNewAlias((prev) => ({
                    ...prev,
                    entityType: e.target.value as 'brand' | 'model',
                    entityId: '',
                  }))
                }
                className="bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
              >
                <option value="brand">Brand</option>
                <option value="model">Model</option>
              </select>
              <select
                value={newAlias.entityId}
                onChange={(e) => setNewAlias((prev) => ({ ...prev, entityId: e.target.value }))}
                className="bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
              >
                <option value="">Select {newAlias.entityType}</option>
                {newAlias.entityType === 'brand'
                  ? brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.canonical_label}
                      </option>
                    ))
                  : models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.canonical_label}
                      </option>
                    ))}
              </select>
              <input
                value={newAlias.label}
                onChange={(e) => setNewAlias((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Alias"
                className="bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
              />
              <div className="flex gap-2">
                <input
                  value={newAlias.priority}
                  onChange={(e) => setNewAlias((prev) => ({ ...prev, priority: e.target.value }))}
                  placeholder="Priority (higher wins)"
                  className="bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2 w-28"
                />
                <button
                  onClick={handleCreateAlias}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded"
                >
                  Add Alias
                </button>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : filteredAliases.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No aliases found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/70 bg-zinc-800">
                    <th className="text-left text-gray-400 font-semibold p-4">Alias</th>
                    <th className="text-left text-gray-400 font-semibold p-4">Type</th>
                    <th className="text-left text-gray-400 font-semibold p-4">Priority</th>
                    <th className="text-left text-gray-400 font-semibold p-4">Status</th>
                    <th className="text-right text-gray-400 font-semibold p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAliases.map((alias) => (
                    <tr key={alias.id} className="border-b border-zinc-800/70 hover:bg-zinc-800/60">
                      <td className="p-4">
                        <div className="text-white font-semibold">{alias.alias_label}</div>
                        <div className="text-xs text-gray-500">
                          {alias.entity_type === 'brand'
                            ? resolveBrandLabel(alias.brand_id)
                            : resolveModelLabel(alias.model_id)}
                        </div>
                      </td>
                      <td className="p-4 text-xs uppercase text-gray-400">{alias.entity_type}</td>
                      <td className="p-4 text-gray-400">{alias.priority ?? 0}</td>
                      <td className="p-4">
                        <StatusPill active={alias.is_active} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end">
                          {renderMenu(
                            `alias-${alias.id}`,
                            () => setEditTarget({ type: 'alias', item: alias }),
                            () => setConfirmTarget({ type: 'alias', item: alias })
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {activeTab === 'candidates' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Candidates</h2>
            <span className="text-xs text-gray-500">{filteredCandidates.length} pending</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No pending candidates.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/70 bg-zinc-800">
                    <th className="text-left text-gray-400 font-semibold p-4">Candidate</th>
                    <th className="text-left text-gray-400 font-semibold p-4">Type</th>
                    <th className="text-left text-gray-400 font-semibold p-4">Brand</th>
                    <th className="text-right text-gray-400 font-semibold p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="border-b border-zinc-800/70 hover:bg-zinc-800/60"
                    >
                      <td className="p-4">
                        <div className="text-white font-semibold">{candidate.raw_text}</div>
                      </td>
                      <td className="p-4 text-xs uppercase text-gray-400">{candidate.entity_type}</td>
                      <td className="p-4 text-gray-400">
                        {candidate.entity_type === 'model'
                          ? resolveBrandLabel(candidate.parent_brand_id)
                          : '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAcceptCandidate(candidate)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-2 text-xs font-semibold"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectCandidate(candidate)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-3 py-2 text-xs font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {showAddBrandModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
          onClick={() => setShowAddBrandModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800/70 rounded-lg w-full max-w-lg p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add Brand</h3>
              <button
                onClick={() => setShowAddBrandModal(false)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={newBrand.label}
                onChange={(e) => setNewBrand((prev) => ({ ...prev, label: e.target.value }))}
                onBlur={(e) =>
                  setNewBrand((prev) => ({ ...prev, label: toTitleCase(e.target.value) }))
                }
                placeholder="Brand label (e.g., Air Jordan)"
                className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddBrandModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBrand}
                className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2"
              >
                Add Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModelModal && modelTargetBrand && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
          onClick={() => {
            setShowAddModelModal(false);
            setModelTargetBrand(null);
          }}
        >
          <div
            className="bg-zinc-900 border border-zinc-800/70 rounded-lg w-full max-w-lg p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Add Model</h3>
                <p className="text-xs text-gray-500">Brand: {modelTargetBrand.canonical_label}</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModelModal(false);
                  setModelTargetBrand(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={newModel.label}
                onChange={(e) => setNewModel((prev) => ({ ...prev, label: e.target.value }))}
                onBlur={(e) =>
                  setNewModel((prev) => ({ ...prev, label: toTitleCase(e.target.value) }))
                }
                placeholder="Model label (e.g., Retro 3)"
                className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModelModal(false);
                  setModelTargetBrand(null);
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateModel}
                className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2"
              >
                Add Model
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && editDraft && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div
            className="bg-zinc-900 border border-zinc-800/70 rounded-lg w-full max-w-lg p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Edit {editTarget.type}</h3>
              <button
                onClick={() => setEditTarget(null)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {editTarget.type === 'brand' && (
              <div className="space-y-3">
                <input
                  value={editDraft.canonical_label}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, canonical_label: e.target.value })
                  }
                  placeholder="Brand label"
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                />
                <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      checked={editDraft.is_active}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, is_active: e.target.checked })
                      }
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      checked={editDraft.is_verified}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, is_verified: e.target.checked })
                      }
                    />
                    Verified
                  </label>
                </div>
              </div>
            )}

            {editTarget.type === 'model' && (
              <div className="space-y-3">
                <select
                  value={editDraft.brand_id}
                  onChange={(e) => setEditDraft({ ...editDraft, brand_id: e.target.value })}
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.canonical_label}
                    </option>
                  ))}
                </select>
                <input
                  value={editDraft.canonical_label}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, canonical_label: e.target.value })
                  }
                  placeholder="Model label"
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                />
                <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      checked={editDraft.is_active}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, is_active: e.target.checked })
                      }
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      checked={editDraft.is_verified}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, is_verified: e.target.checked })
                      }
                    />
                    Verified
                  </label>
                </div>
              </div>
            )}

            {editTarget.type === 'alias' && (
              <div className="space-y-3">
                <input
                  value={editDraft.alias_label}
                  onChange={(e) => setEditDraft({ ...editDraft, alias_label: e.target.value })}
                  placeholder="Alias"
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                />
                <input
                  value={editDraft.priority ?? 0}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, priority: Number(e.target.value) })
                  }
                  placeholder="Priority"
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                />
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    className="rdk-checkbox"
                    checked={editDraft.is_active}
                    onChange={(e) => setEditDraft({ ...editDraft, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setEditTarget(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 disabled:bg-gray-600"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div
            className="bg-zinc-900 border border-zinc-800/70 rounded-lg w-full max-w-md p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Delete {confirmTarget.type}</h3>
            <p className="text-sm text-gray-400">
              This will disable the item (soft delete). You can re-enable it later by editing the record.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 disabled:bg-gray-600"
              >
                {isSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
