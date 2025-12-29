'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, MoreHorizontal, Search } from 'lucide-react';
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

type ActiveTab = 'catalog' | 'brands' | 'models' | 'aliases' | 'groups' | 'candidates';

type EditTarget =
  | { type: 'group'; item: BrandGroup }
  | { type: 'brand'; item: Brand }
  | { type: 'model'; item: Model }
  | { type: 'alias'; item: Alias };

const tabs: Array<{ key: ActiveTab; label: string }> = [
  { key: 'catalog', label: 'Catalog' },
  { key: 'aliases', label: 'Aliases' },
  { key: 'candidates', label: 'Candidates' },
];

const emptyDraft = {
  group: { key: '', label: '' },
  brand: { groupId: '', label: '' },
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

const toGroupKey = (value: string) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

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

export default function CatalogPage() {
  const [groups, setGroups] = useState<BrandGroup[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showUnverified, setShowUnverified] = useState(true);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const [newGroup, setNewGroup] = useState(emptyDraft.group);
  const [newBrand, setNewBrand] = useState(emptyDraft.brand);
  const [newModel, setNewModel] = useState(emptyDraft.model);
  const [newAlias, setNewAlias] = useState(emptyDraft.alias);
  const [candidateGroupSelections, setCandidateGroupSelections] = useState<Record<string, string>>({});

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);
  const [confirmTarget, setConfirmTarget] = useState<EditTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (value: string) =>
    normalizedQuery.length === 0 || value.toLowerCase().includes(normalizedQuery);

  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const brandMap = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);
  const modelMap = useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);

  const filteredGroups = useMemo(
    () =>
      groups.filter((group) => {
        if (!showInactive && !group.is_active) return false;
        if (!matchesQuery(group.label) && !matchesQuery(group.key)) return false;
        return true;
      }),
    [groups, showInactive, normalizedQuery]
  );

  const filteredBrands = useMemo(
    () =>
      brands.filter((brand) => {
        if (!showInactive && !brand.is_active) return false;
        if (!showUnverified && !brand.is_verified) return false;
        const groupLabel = groupMap.get(brand.group_id)?.label ?? '';
        if (!matchesQuery(brand.canonical_label) && !matchesQuery(groupLabel)) return false;
        return true;
      }),
    [brands, showInactive, showUnverified, normalizedQuery, groupMap]
  );

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

  const eligibleGroups = useMemo(
    () => groups.filter((group) => showInactive || group.is_active),
    [groups, showInactive]
  );

  const eligibleBrands = useMemo(
    () =>
      brands.filter((brand) => {
        if (!showInactive && !brand.is_active) return false;
        if (!showUnverified && !brand.is_verified) return false;
        return true;
      }),
    [brands, showInactive, showUnverified]
  );

  const eligibleModels = useMemo(
    () =>
      models.filter((model) => {
        if (!showInactive && !model.is_active) return false;
        if (!showUnverified && !model.is_verified) return false;
        return true;
      }),
    [models, showInactive, showUnverified]
  );

  const eligibleGroupIds = useMemo(
    () => new Set(eligibleGroups.map((group) => group.id)),
    [eligibleGroups]
  );
  const eligibleBrandIds = useMemo(
    () => new Set(eligibleBrands.map((brand) => brand.id)),
    [eligibleBrands]
  );
  const eligibleModelIds = useMemo(
    () => new Set(eligibleModels.map((model) => model.id)),
    [eligibleModels]
  );

  const queryGroupIds = useMemo(
    () => new Set(filteredGroups.map((group) => group.id)),
    [filteredGroups]
  );
  const queryBrandIds = useMemo(
    () => new Set(filteredBrands.map((brand) => brand.id)),
    [filteredBrands]
  );
  const queryModelIds = useMemo(
    () => new Set(filteredModels.map((model) => model.id)),
    [filteredModels]
  );

  const brandsByGroup = useMemo(() => {
    const map: Record<string, Brand[]> = {};
    brands.forEach((brand) => {
      if (!map[brand.group_id]) {
        map[brand.group_id] = [];
      }
      map[brand.group_id].push(brand);
    });
    Object.keys(map).forEach((groupId) => {
      map[groupId].sort((a, b) => a.canonical_label.localeCompare(b.canonical_label));
    });
    return map;
  }, [brands]);

  const modelsByBrandId = useMemo(() => {
    const map: Record<string, Model[]> = {};
    models.forEach((model) => {
      if (!map[model.brand_id]) {
        map[model.brand_id] = [];
      }
      map[model.brand_id].push(model);
    });
    Object.keys(map).forEach((brandId) => {
      map[brandId].sort((a, b) => a.canonical_label.localeCompare(b.canonical_label));
    });
    return map;
  }, [models]);

  const visibleGroups = useMemo(() => {
    return groups.filter((group) => {
      if (!eligibleGroupIds.has(group.id)) return false;
      if (normalizedQuery.length === 0) return true;
      if (queryGroupIds.has(group.id)) return true;
      const groupBrands = brandsByGroup[group.id] ?? [];
      return groupBrands.some((brand) => {
        if (!eligibleBrandIds.has(brand.id)) return false;
        if (queryBrandIds.has(brand.id)) return true;
        const brandModels = modelsByBrandId[brand.id] ?? [];
        return brandModels.some((model) => queryModelIds.has(model.id));
      });
    });
  }, [
    brandsByGroup,
    eligibleBrandIds,
    eligibleGroupIds,
    groups,
    modelsByBrandId,
    normalizedQuery,
    queryBrandIds,
    queryGroupIds,
    queryModelIds,
  ]);

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
      setMessage('Failed to load catalog data.');
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

    if (editTarget.type === 'group') {
      setEditDraft({
        key: editTarget.item.key,
        label: editTarget.item.label,
        is_active: editTarget.item.is_active,
      });
    }
    if (editTarget.type === 'brand') {
      setEditDraft({
        canonical_label: editTarget.item.canonical_label,
        group_id: editTarget.item.group_id,
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

  const handleCreateGroup = async () => {
    if (!newGroup.label.trim()) {
      setMessage('Group label is required.');
      return;
    }
    const formattedLabel = toTitleCase(newGroup.label);
    const formattedKey = newGroup.key.trim()
      ? toGroupKey(newGroup.key)
      : toGroupKey(formattedLabel);
    if (!formattedKey) {
      setMessage('Group key is required.');
      return;
    }
    const response = await fetch('/api/admin/catalog/brand-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: formattedKey, label: formattedLabel }),
    });
    if (response.ok) {
      setNewGroup(emptyDraft.group);
      await loadAll();
    } else {
      setMessage('Failed to create brand group.');
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrand.groupId || !newBrand.label.trim()) {
      setMessage('Brand group and label are required.');
      return;
    }
    const formattedLabel = toTitleCase(newBrand.label);
    const response = await fetch('/api/admin/catalog/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: newBrand.groupId, canonicalLabel: formattedLabel }),
    });
    if (response.ok) {
      setNewBrand(emptyDraft.brand);
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
    const response = await fetch('/api/admin/catalog/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: newModel.brandId, canonicalLabel: formattedLabel }),
    });
    if (response.ok) {
      setNewModel(emptyDraft.model);
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
    const groupId = candidateGroupSelections[candidate.id] || '';
    const response = await fetch(`/api/admin/catalog/candidates/${candidate.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: candidate.entity_type === 'brand' ? groupId || undefined : undefined,
      }),
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
    setIsSaving(true);
    setMessage('');
    try {
      if (editTarget.type === 'group') {
        await fetch(`/api/admin/catalog/brand-groups/${editTarget.item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: editDraft.key,
            label: editDraft.label,
            isActive: editDraft.is_active,
          }),
        });
      }

      if (editTarget.type === 'brand') {
        await fetch(`/api/admin/catalog/brands/${editTarget.item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: editDraft.group_id,
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
      setMessage('Failed to update catalog item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    setIsSaving(true);
    setMessage('');
    try {
      if (confirmTarget.type === 'group') {
        await fetch(`/api/admin/catalog/brand-groups/${confirmTarget.item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        });
      }
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
      setMessage('Failed to delete catalog item.');
    } finally {
      setIsSaving(false);
    }
  };

  const resolveBrandLabel = (brandId?: string | null) =>
    brandMap.get(brandId ?? '')?.canonical_label || 'Unknown';

  const resolveModelLabel = (modelId?: string | null) =>
    modelMap.get(modelId ?? '')?.canonical_label || 'Unknown';

  const resolveGroupLabel = (groupId?: string | null) =>
    groupMap.get(groupId ?? '')?.label || 'Unknown';

  const renderMenu = (key: string, onEdit: () => void, onDelete: () => void) => (
    <div
      className="relative"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <button
        onClick={() => toggleMenu(key)}
        className="p-2 rounded hover:bg-zinc-800 text-gray-400 hover:text-white"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {openMenuKey === key && (
        <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-zinc-800/70 rounded shadow-lg z-10">
          <button
            onClick={() => {
              setOpenMenuKey(null);
              onEdit();
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-zinc-800"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setOpenMenuKey(null);
              onDelete();
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-zinc-800"
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
          <h1 className="text-3xl font-bold text-white">Catalog Manager</h1>
          <p className="text-gray-400">
            Verified means the brand or model is confirmed and trusted for storefront filters. Unverified entries are
            allowed but treated as provisional.
          </p>
        </div>
      </div>

      {message && <div className="text-sm text-gray-400">{message}</div>}

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4">
        <details className="group" open>
          <summary className="cursor-pointer list-none text-sm text-gray-200 font-medium flex items-center justify-between">
            <span>Info key: how the catalog system works</span>
            <span className="text-xs text-gray-500 group-open:hidden">Show</span>
            <span className="text-xs text-gray-500 hidden group-open:inline">Hide</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm text-gray-300">
            <div className="bg-zinc-950/40 border border-zinc-800/70 rounded p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Brand Groups</div>
              <div>Top-level buckets used for navigation (Nike, Designer). Groups are not brands.</div>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/70 rounded p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Brands</div>
              <div>Canonical brand labels used for products and filters. Each brand belongs to one group.</div>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/70 rounded p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Models</div>
              <div>Canonical sneaker model labels tied to a brand. Only used when category is sneakers.</div>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/70 rounded p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Aliases</div>
              <div>Alternate spellings or shorthand that map to brands/models. Used by the parser.</div>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/70 rounded p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Alias Priority</div>
              <div>When multiple aliases match, higher priority wins over shorter or lower-priority matches.</div>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/70 rounded p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Candidates</div>
              <div>Unknown brands/models created during product entry. Review and accept to add them.</div>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/70 rounded p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Verified</div>
              <div>Trusted entries that appear cleanly in storefront filters. Unverified is provisional.</div>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/70 rounded p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Active</div>
              <div>Active entries are used by the parser and UI. Inactive hides them without deleting.</div>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/70 rounded p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Title Parsing</div>
              <div>
                Full titles are parsed into brand, model, and name. Brand is found first, then model
                (sneakers only), and the remainder becomes the name.
              </div>
            </div>
          </div>
        </details>
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 bg-zinc-950/40 border border-zinc-800/70 rounded px-3 py-2 w-full lg:w-80">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search catalog..."
              className="bg-transparent text-sm text-white outline-none flex-1"
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

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 rounded-full text-sm ${
                activeTab === tab.key
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'catalog' && (
        <section className="bg-zinc-900 border border-zinc-800/70 rounded p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Catalog</h2>
              <p className="text-xs text-gray-500">Groups → Brands → Models in one place.</p>
            </div>
            <span className="text-xs text-gray-500">
              {eligibleGroups.length} groups · {eligibleBrands.length} brands · {eligibleModels.length} models
            </span>
          </div>

          <details className="group bg-zinc-950/40 border border-zinc-800/70 rounded p-4">
            <summary className="cursor-pointer list-none text-sm text-gray-200 font-medium flex items-center justify-between">
              <span>Add new catalog entries</span>
              <span className="text-xs text-gray-500 group-open:hidden">Show</span>
              <span className="text-xs text-gray-500 hidden group-open:inline">Hide</span>
            </summary>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
              <div className="bg-zinc-950/60 border border-zinc-800/70 rounded p-4 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Add Group</div>
                  <p className="text-xs text-gray-500">Top-level bucket like Nike, Designer. Key auto-fills if blank.</p>
                </div>
                <input
                  value={newGroup.label}
                  onChange={(e) =>
                    setNewGroup((prev) => ({
                      ...prev,
                      label: e.target.value,
                      key: prev.key ? prev.key : toGroupKey(e.target.value),
                    }))
                  }
                  onBlur={(e) =>
                    setNewGroup((prev) => ({
                      ...prev,
                      label: toTitleCase(e.target.value),
                      key: prev.key ? toGroupKey(prev.key) : toGroupKey(e.target.value),
                    }))
                  }
                  placeholder="Group label (e.g., New Balance)"
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                />
                <input
                  value={newGroup.key}
                  onChange={(e) => setNewGroup((prev) => ({ ...prev, key: e.target.value }))}
                  onBlur={(e) => setNewGroup((prev) => ({ ...prev, key: toGroupKey(e.target.value) }))}
                  placeholder="Group key (auto if blank)"
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                />
                <button
                  onClick={handleCreateGroup}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4 py-2"
                >
                  Add Group
                </button>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/70 rounded p-4 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Add Brand</div>
                  <p className="text-xs text-gray-500">Canonical brand label tied to one group.</p>
                </div>
                <select
                  value={newBrand.groupId}
                  onChange={(e) => setNewBrand((prev) => ({ ...prev, groupId: e.target.value }))}
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                >
                  <option value="">Select group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
                <input
                  value={newBrand.label}
                  onChange={(e) => setNewBrand((prev) => ({ ...prev, label: e.target.value }))}
                  onBlur={(e) =>
                    setNewBrand((prev) => ({ ...prev, label: toTitleCase(e.target.value) }))
                  }
                  placeholder="Brand label (e.g., Off-White)"
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                />
                <button
                  onClick={handleCreateBrand}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4 py-2"
                >
                  Add Brand
                </button>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/70 rounded p-4 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Add Model</div>
                  <p className="text-xs text-gray-500">Model labels are sneaker-only.</p>
                </div>
                <select
                  value={newModel.brandId}
                  onChange={(e) => setNewModel((prev) => ({ ...prev, brandId: e.target.value }))}
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                >
                  <option value="">Select brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.canonical_label}
                    </option>
                  ))}
                </select>
                <input
                  value={newModel.label}
                  onChange={(e) => setNewModel((prev) => ({ ...prev, label: e.target.value }))}
                  onBlur={(e) =>
                    setNewModel((prev) => ({ ...prev, label: toTitleCase(e.target.value) }))
                  }
                  placeholder="Model label (e.g., Air Max 90)"
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                />
                <button
                  onClick={handleCreateModel}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4 py-2"
                >
                  Add Model
                </button>
              </div>
            </div>
          </details>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}
            {!isLoading && visibleGroups.length === 0 && (
              <div className="text-gray-500 text-sm">No matching groups or brands.</div>
            )}
            {visibleGroups.map((group) => {
              const groupBrands = brandsByGroup[group.id] ?? [];
              const groupMatchesQuery = queryGroupIds.has(group.id);
              const showAllBrands = normalizedQuery.length === 0 || groupMatchesQuery;
              const visibleBrands = groupBrands.filter((brand) => {
                if (!eligibleBrandIds.has(brand.id)) return false;
                if (showAllBrands) return true;
                if (queryBrandIds.has(brand.id)) return true;
                const brandModels = modelsByBrandId[brand.id] ?? [];
                return brandModels.some((model) => queryModelIds.has(model.id));
              });

              return (
                <details key={group.id} className="group rounded border border-zinc-800/70 bg-zinc-950/40">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-white font-medium">{group.label}</div>
                      <div className="text-xs text-gray-500">
                        {group.key} · {visibleBrands.length} brands
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill active={group.is_active} />
                      {renderMenu(
                        `group-${group.id}`,
                        () => setEditTarget({ type: 'group', item: group }),
                        () => setConfirmTarget({ type: 'group', item: group })
                      )}
                      <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                    </div>
                  </summary>
                  <div className="px-4 pb-4 space-y-2">
                    {visibleBrands.length === 0 && (
                      <div className="text-xs text-gray-500">No matching brands.</div>
                    )}
                    {visibleBrands.map((brand) => {
                      const brandModels = modelsByBrandId[brand.id] ?? [];
                      const brandMatchesQuery = queryBrandIds.has(brand.id);
                      const showAllModels = normalizedQuery.length === 0 || brandMatchesQuery || groupMatchesQuery;
                      const visibleModels = brandModels.filter((model) => {
                        if (!eligibleModelIds.has(model.id)) return false;
                        if (showAllModels) return true;
                        return queryModelIds.has(model.id);
                      });

                      return (
                        <details
                          key={brand.id}
                          className="group/brand rounded border border-zinc-800/70 bg-black/60"
                        >
                          <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-white font-medium">{brand.canonical_label}</div>
                              <div className="text-xs text-gray-500">
                                {visibleModels.length} models
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusPill active={brand.is_active} />
                              <VerifiedPill verified={brand.is_verified} />
                              {renderMenu(
                                `brand-${brand.id}`,
                                () => setEditTarget({ type: 'brand', item: brand }),
                                () => setConfirmTarget({ type: 'brand', item: brand })
                              )}
                              <ChevronDown className="w-4 h-4 text-gray-400 group-open/brand:rotate-180 transition-transform" />
                            </div>
                          </summary>
                          <div className="px-4 pb-4 space-y-2">
                            {visibleModels.length === 0 && (
                              <div className="text-xs text-gray-500">No matching models.</div>
                            )}
                            {visibleModels.map((model) => (
                              <div
                                key={model.id}
                                className="flex items-center justify-between gap-3 border border-zinc-800/70 rounded px-3 py-2"
                              >
                                <div>
                                  <div className="text-white text-sm">{model.canonical_label}</div>
                                </div>
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
                        </details>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'groups' && (
        <section className="bg-zinc-900 border border-zinc-800/70 rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Brand Groups</h2>
            <span className="text-xs text-gray-500">{filteredGroups.length} groups</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={newGroup.key}
              onChange={(e) => setNewGroup((prev) => ({ ...prev, key: e.target.value }))}
              placeholder="Key"
              className="bg-zinc-800 text-white px-3 py-2 rounded"
            />
            <input
              value={newGroup.label}
              onChange={(e) => setNewGroup((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Label"
              className="bg-zinc-800 text-white px-3 py-2 rounded"
            />
            <button
              onClick={handleCreateGroup}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4 py-2"
            >
              Add Group
            </button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}
            {!isLoading && filteredGroups.length === 0 && (
              <div className="text-gray-500 text-sm">No groups found.</div>
            )}
            {filteredGroups.map((group) => (
              <div key={group.id} className="bg-zinc-800/60 border border-zinc-800/70 rounded p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-4">
                    <div className="text-white font-medium">{group.label}</div>
                    <div className="text-xs text-gray-500">{group.key}</div>
                  </div>
                  <div className="md:col-span-3">
                    <StatusPill active={group.is_active} />
                  </div>
                  <div className="md:col-span-5 flex justify-end">
                    {renderMenu(
                      `group-${group.id}`,
                      () => setEditTarget({ type: 'group', item: group }),
                      () => setConfirmTarget({ type: 'group', item: group })
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'brands' && (
        <section className="bg-zinc-900 border border-zinc-800/70 rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Brands</h2>
            <span className="text-xs text-gray-500">{filteredBrands.length} brands</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={newBrand.groupId}
              onChange={(e) => setNewBrand((prev) => ({ ...prev, groupId: e.target.value }))}
              className="bg-zinc-800 text-white px-3 py-2 rounded"
            >
              <option value="">Select group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
            <input
              value={newBrand.label}
              onChange={(e) => setNewBrand((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Brand label"
              className="bg-zinc-800 text-white px-3 py-2 rounded"
            />
            <button
              onClick={handleCreateBrand}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4 py-2"
            >
              Add Brand
            </button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}
            {!isLoading && filteredBrands.length === 0 && (
              <div className="text-gray-500 text-sm">No brands found.</div>
            )}
            {filteredBrands.map((brand) => (
              <div key={brand.id} className="bg-zinc-800/60 border border-zinc-800/70 rounded p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-4">
                    <div className="text-white font-medium">{brand.canonical_label}</div>
                    <div className="text-xs text-gray-500">{resolveGroupLabel(brand.group_id)}</div>
                  </div>
                  <div className="md:col-span-4 flex flex-wrap gap-2">
                    <StatusPill active={brand.is_active} />
                    <VerifiedPill verified={brand.is_verified} />
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                    {renderMenu(
                      `brand-${brand.id}`,
                      () => setEditTarget({ type: 'brand', item: brand }),
                      () => setConfirmTarget({ type: 'brand', item: brand })
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'models' && (
        <section className="bg-zinc-900 border border-zinc-800/70 rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Models</h2>
            <span className="text-xs text-gray-500">{filteredModels.length} models</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={newModel.brandId}
              onChange={(e) => setNewModel((prev) => ({ ...prev, brandId: e.target.value }))}
              className="bg-zinc-800 text-white px-3 py-2 rounded"
            >
              <option value="">Select brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.canonical_label}
                </option>
              ))}
            </select>
            <input
              value={newModel.label}
              onChange={(e) => setNewModel((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Model label"
              className="bg-zinc-800 text-white px-3 py-2 rounded"
            />
            <button
              onClick={handleCreateModel}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4 py-2"
            >
              Add Model
            </button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}
            {!isLoading && filteredModels.length === 0 && (
              <div className="text-gray-500 text-sm">No models found.</div>
            )}
            {filteredModels.map((model) => (
              <div key={model.id} className="bg-zinc-800/60 border border-zinc-800/70 rounded p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-4">
                    <div className="text-white font-medium">{model.canonical_label}</div>
                    <div className="text-xs text-gray-500">{resolveBrandLabel(model.brand_id)}</div>
                  </div>
                  <div className="md:col-span-4 flex flex-wrap gap-2">
                    <StatusPill active={model.is_active} />
                    <VerifiedPill verified={model.is_verified} />
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                    {renderMenu(
                      `model-${model.id}`,
                      () => setEditTarget({ type: 'model', item: model }),
                      () => setConfirmTarget({ type: 'model', item: model })
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'aliases' && (
        <section className="bg-zinc-900 border border-zinc-800/70 rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Aliases</h2>
            <span className="text-xs text-gray-500">{filteredAliases.length} aliases</span>
          </div>
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
              className="bg-zinc-800 text-white px-3 py-2 rounded"
            >
              <option value="brand">Brand</option>
              <option value="model">Model</option>
            </select>
            <select
              value={newAlias.entityId}
              onChange={(e) => setNewAlias((prev) => ({ ...prev, entityId: e.target.value }))}
              className="bg-zinc-800 text-white px-3 py-2 rounded"
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
              className="bg-zinc-800 text-white px-3 py-2 rounded"
            />
            <div className="flex gap-2">
              <input
                value={newAlias.priority}
                onChange={(e) => setNewAlias((prev) => ({ ...prev, priority: e.target.value }))}
                placeholder="Priority (higher wins)"
                className="bg-zinc-800 text-white px-3 py-2 rounded w-24"
              />
              <button
                onClick={handleCreateAlias}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4 py-2"
              >
                Add Alias
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}
            {!isLoading && filteredAliases.length === 0 && (
              <div className="text-gray-500 text-sm">No aliases found.</div>
            )}
            {filteredAliases.map((alias) => (
              <div key={alias.id} className="bg-zinc-800/60 border border-zinc-800/70 rounded p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-4">
                    <div className="text-white font-medium">{alias.alias_label}</div>
                    <div className="text-xs text-gray-500">
                      {alias.entity_type === 'brand'
                        ? resolveBrandLabel(alias.brand_id)
                        : resolveModelLabel(alias.model_id)}
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <div className="text-xs text-gray-400 uppercase">{alias.entity_type}</div>
                    <div className="text-xs text-gray-500">Priority {alias.priority ?? 0}</div>
                  </div>
                  <div className="md:col-span-3">
                    <StatusPill active={alias.is_active} />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    {renderMenu(
                      `alias-${alias.id}`,
                      () => setEditTarget({ type: 'alias', item: alias }),
                      () => setConfirmTarget({ type: 'alias', item: alias })
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'candidates' && (
        <section className="bg-zinc-900 border border-zinc-800/70 rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Candidates</h2>
            <span className="text-xs text-gray-500">{filteredCandidates.length} pending</span>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}
            {!isLoading && filteredCandidates.length === 0 && (
              <div className="text-gray-500 text-sm">No pending candidates.</div>
            )}
            {filteredCandidates.map((candidate) => (
              <div key={candidate.id} className="bg-zinc-800/60 border border-zinc-800/70 rounded p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-4">
                    <div className="text-white font-medium">{candidate.raw_text}</div>
                    <div className="text-xs text-gray-500 uppercase">{candidate.entity_type}</div>
                  </div>
                  <div className="md:col-span-4 text-xs text-gray-400">
                    {candidate.entity_type === 'model'
                      ? `Brand: ${resolveBrandLabel(candidate.parent_brand_id)}`
                      : 'Brand group required for accept'}
                  </div>
                  <div className="md:col-span-4 flex flex-wrap gap-2 md:justify-end">
                    {candidate.entity_type === 'brand' && (
                      <select
                        value={candidateGroupSelections[candidate.id] || ''}
                        onChange={(e) =>
                          setCandidateGroupSelections((prev) => ({
                            ...prev,
                            [candidate.id]: e.target.value,
                          }))
                        }
                        className="bg-zinc-900 text-white px-3 py-2 rounded"
                      >
                        <option value="">Select group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => handleAcceptCandidate(candidate)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-2"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectCandidate(candidate)}
                      className="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-3 py-2"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
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

            {editTarget.type === 'group' && (
              <div className="space-y-3">
                <input
                  value={editDraft.key}
                  onChange={(e) => setEditDraft({ ...editDraft, key: e.target.value })}
                  placeholder="Key"
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                />
                <input
                  value={editDraft.label}
                  onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })}
                  placeholder="Label"
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

            {editTarget.type === 'brand' && (
              <div className="space-y-3">
                <select
                  value={editDraft.group_id}
                  onChange={(e) => setEditDraft({ ...editDraft, group_id: e.target.value })}
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
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
