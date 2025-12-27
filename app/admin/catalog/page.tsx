'use client';

import { useEffect, useState } from 'react';

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

export default function CatalogPage() {
  const [groups, setGroups] = useState<BrandGroup[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState('');

  const [newGroup, setNewGroup] = useState({ key: '', label: '' });
  const [newBrand, setNewBrand] = useState({ groupId: '', label: '' });
  const [newModel, setNewModel] = useState({ brandId: '', label: '' });
  const [newAlias, setNewAlias] = useState({
    entityType: 'brand' as 'brand' | 'model',
    entityId: '',
    label: '',
    priority: '0',
  });
  const [candidateGroupSelections, setCandidateGroupSelections] = useState<Record<string, string>>({});

  const loadAll = async () => {
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
      console.error('Load catalog error:', error);
      setMessage('Failed to load catalog data.');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateGroupField = (id: string, field: keyof BrandGroup, value: string | boolean) => {
    setGroups((prev) => prev.map((group) => (group.id === id ? { ...group, [field]: value } : group)));
  };

  const updateBrandField = (id: string, field: keyof Brand, value: string | boolean) => {
    setBrands((prev) => prev.map((brand) => (brand.id === id ? { ...brand, [field]: value } : brand)));
  };

  const updateModelField = (id: string, field: keyof Model, value: string | boolean) => {
    setModels((prev) => prev.map((model) => (model.id === id ? { ...model, [field]: value } : model)));
  };

  const updateAliasField = (id: string, field: keyof Alias, value: string | boolean | number) => {
    setAliases((prev) => prev.map((alias) => (alias.id === id ? { ...alias, [field]: value } : alias)));
  };

  const handleCreateGroup = async () => {
    if (!newGroup.key.trim() || !newGroup.label.trim()) {
      setMessage('Group key and label are required.');
      return;
    }
    const response = await fetch('/api/admin/catalog/brand-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: newGroup.key.trim(), label: newGroup.label.trim() }),
    });
    if (response.ok) {
      setNewGroup({ key: '', label: '' });
      await loadAll();
    } else {
      setMessage('Failed to create brand group.');
    }
  };

  const handleSaveGroup = async (group: BrandGroup) => {
    const response = await fetch(`/api/admin/catalog/brand-groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: group.key,
        label: group.label,
        isActive: group.is_active,
      }),
    });
    if (!response.ok) {
      setMessage('Failed to update brand group.');
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrand.groupId || !newBrand.label.trim()) {
      setMessage('Brand group and label are required.');
      return;
    }
    const response = await fetch('/api/admin/catalog/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: newBrand.groupId, canonicalLabel: newBrand.label.trim() }),
    });
    if (response.ok) {
      setNewBrand({ groupId: '', label: '' });
      await loadAll();
    } else {
      setMessage('Failed to create brand.');
    }
  };

  const handleSaveBrand = async (brand: Brand) => {
    const response = await fetch(`/api/admin/catalog/brands/${brand.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: brand.group_id,
        canonicalLabel: brand.canonical_label,
        isActive: brand.is_active,
        isVerified: brand.is_verified,
      }),
    });
    if (!response.ok) {
      setMessage('Failed to update brand.');
    }
  };

  const handleCreateModel = async () => {
    if (!newModel.brandId || !newModel.label.trim()) {
      setMessage('Brand and model label are required.');
      return;
    }
    const response = await fetch('/api/admin/catalog/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: newModel.brandId, canonicalLabel: newModel.label.trim() }),
    });
    if (response.ok) {
      setNewModel({ brandId: '', label: '' });
      await loadAll();
    } else {
      setMessage('Failed to create model.');
    }
  };

  const handleSaveModel = async (model: Model) => {
    const response = await fetch(`/api/admin/catalog/models/${model.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId: model.brand_id,
        canonicalLabel: model.canonical_label,
        isActive: model.is_active,
        isVerified: model.is_verified,
      }),
    });
    if (!response.ok) {
      setMessage('Failed to update model.');
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
      setNewAlias({ entityType: 'brand', entityId: '', label: '', priority: '0' });
      await loadAll();
    } else {
      setMessage('Failed to create alias.');
    }
  };

  const handleSaveAlias = async (alias: Alias) => {
    const response = await fetch(`/api/admin/catalog/aliases/${alias.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aliasLabel: alias.alias_label,
        priority: alias.priority,
        isActive: alias.is_active,
      }),
    });
    if (!response.ok) {
      setMessage('Failed to update alias.');
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

  const resolveBrandLabel = (brandId?: string | null) =>
    brands.find((brand) => brand.id === brandId)?.canonical_label || 'Unknown';

  const resolveModelLabel = (modelId?: string | null) =>
    models.find((model) => model.id === modelId)?.canonical_label || 'Unknown';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Catalog Manager</h1>
        <p className="text-gray-400">Manage brands, models, aliases, and review candidates.</p>
        {message && <div className="text-sm text-gray-400 mt-2">{message}</div>}
      </div>

      <section className="bg-zinc-900 border border-red-900/20 rounded p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Brand Groups</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={newGroup.key}
            onChange={(e) => setNewGroup((prev) => ({ ...prev, key: e.target.value }))}
            placeholder="key (e.g., nike)"
            className="bg-zinc-800 text-white px-3 py-2 rounded"
          />
          <input
            value={newGroup.label}
            onChange={(e) => setNewGroup((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="Label (e.g., Nike)"
            className="bg-zinc-800 text-white px-3 py-2 rounded"
          />
          <button
            onClick={handleCreateGroup}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4"
          >
            Add Group
          </button>
        </div>
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center bg-zinc-800/60 p-3 rounded">
              <input
                value={group.key}
                onChange={(e) => updateGroupField(group.id, 'key', e.target.value)}
                className="bg-zinc-900 text-white px-3 py-2 rounded"
              />
              <input
                value={group.label}
                onChange={(e) => updateGroupField(group.id, 'label', e.target.value)}
                className="bg-zinc-900 text-white px-3 py-2 rounded"
              />
              <label className="text-gray-300 text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={group.is_active}
                  onChange={(e) => updateGroupField(group.id, 'is_active', e.target.checked)}
                />
                Active
              </label>
              <button
                onClick={() => handleSaveGroup(group)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-3 py-2"
              >
                Save
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-zinc-900 border border-red-900/20 rounded p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Brands</h2>
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
            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4"
          >
            Add Brand
          </button>
        </div>
        <div className="space-y-2">
          {brands.map((brand) => (
            <div key={brand.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center bg-zinc-800/60 p-3 rounded">
              <select
                value={brand.group_id}
                onChange={(e) => updateBrandField(brand.id, 'group_id', e.target.value)}
                className="bg-zinc-900 text-white px-3 py-2 rounded"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
              <input
                value={brand.canonical_label}
                onChange={(e) => updateBrandField(brand.id, 'canonical_label', e.target.value)}
                className="bg-zinc-900 text-white px-3 py-2 rounded"
              />
              <label className="text-gray-300 text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={brand.is_active}
                  onChange={(e) => updateBrandField(brand.id, 'is_active', e.target.checked)}
                />
                Active
              </label>
              <label className="text-gray-300 text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={brand.is_verified}
                  onChange={(e) => updateBrandField(brand.id, 'is_verified', e.target.checked)}
                />
                Verified
              </label>
              <button
                onClick={() => handleSaveBrand(brand)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-3 py-2"
              >
                Save
              </button>
              <span className="text-xs text-gray-500">{brand.group?.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-zinc-900 border border-red-900/20 rounded p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Models</h2>
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
            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4"
          >
            Add Model
          </button>
        </div>
        <div className="space-y-2">
          {models.map((model) => (
            <div key={model.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center bg-zinc-800/60 p-3 rounded">
              <select
                value={model.brand_id}
                onChange={(e) => updateModelField(model.id, 'brand_id', e.target.value)}
                className="bg-zinc-900 text-white px-3 py-2 rounded"
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.canonical_label}
                  </option>
                ))}
              </select>
              <input
                value={model.canonical_label}
                onChange={(e) => updateModelField(model.id, 'canonical_label', e.target.value)}
                className="bg-zinc-900 text-white px-3 py-2 rounded"
              />
              <label className="text-gray-300 text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={model.is_active}
                  onChange={(e) => updateModelField(model.id, 'is_active', e.target.checked)}
                />
                Active
              </label>
              <label className="text-gray-300 text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={model.is_verified}
                  onChange={(e) => updateModelField(model.id, 'is_verified', e.target.checked)}
                />
                Verified
              </label>
              <button
                onClick={() => handleSaveModel(model)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-3 py-2"
              >
                Save
              </button>
              <span className="text-xs text-gray-500">{resolveBrandLabel(model.brand_id)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-zinc-900 border border-red-900/20 rounded p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Aliases</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={newAlias.entityType}
            onChange={(e) => setNewAlias((prev) => ({ ...prev, entityType: e.target.value as 'brand' | 'model', entityId: '' }))}
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
              placeholder="Priority"
              className="bg-zinc-800 text-white px-3 py-2 rounded w-24"
            />
            <button
              onClick={handleCreateAlias}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-4"
            >
              Add
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {aliases.map((alias) => (
            <div key={alias.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center bg-zinc-800/60 p-3 rounded">
              <div className="text-xs text-gray-400">{alias.entity_type}</div>
              <div className="text-xs text-gray-500">
                {alias.entity_type === 'brand'
                  ? resolveBrandLabel(alias.brand_id)
                  : resolveModelLabel(alias.model_id)}
              </div>
              <input
                value={alias.alias_label}
                onChange={(e) => updateAliasField(alias.id, 'alias_label', e.target.value)}
                className="bg-zinc-900 text-white px-3 py-2 rounded"
              />
              <input
                value={alias.priority ?? 0}
                onChange={(e) => updateAliasField(alias.id, 'priority', Number(e.target.value))}
                className="bg-zinc-900 text-white px-3 py-2 rounded"
              />
              <label className="text-gray-300 text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={alias.is_active}
                  onChange={(e) => updateAliasField(alias.id, 'is_active', e.target.checked)}
                />
                Active
              </label>
              <button
                onClick={() => handleSaveAlias(alias)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-3 py-2"
              >
                Save
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-zinc-900 border border-red-900/20 rounded p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Candidates</h2>
        {candidates.length === 0 ? (
          <div className="text-gray-400 text-sm">No pending candidates.</div>
        ) : (
          <div className="space-y-2">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center bg-zinc-800/60 p-3 rounded">
                <div className="text-xs text-gray-400">{candidate.entity_type}</div>
                <div className="text-gray-200">{candidate.raw_text}</div>
                <div className="text-xs text-gray-500">
                  {candidate.entity_type === 'model'
                    ? resolveBrandLabel(candidate.parent_brand_id)
                    : '-'}
                </div>
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
                  className="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-2"
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
