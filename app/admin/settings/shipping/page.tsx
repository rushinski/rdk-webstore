// app/admin/settings/shipping/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { logError } from '@/lib/log';

const SHIPPING_CATEGORIES = [
  { key: 'sneakers', label: 'Sneakers' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'electronics', label: 'Electronics' },
];

// Available EasyPost carriers for UPS
const AVAILABLE_CARRIERS = [
  { key: 'UPS', label: 'UPS', description: 'United Parcel Service' },
  { key: 'USPS', label: 'USPS', description: 'United States Postal Service' },
  { key: 'FedEx', label: 'FedEx', description: 'Federal Express' },
];

type ShippingDefaultValues = {
  shipping_cost_cents: number;
  default_weight_oz: number;
  default_length_in: number;
  default_width_in: number;
  default_height_in: number;
};

const defaultPackage: ShippingDefaultValues = {
  shipping_cost_cents: 0,
  default_weight_oz: 16,
  default_length_in: 12,
  default_width_in: 12,
  default_height_in: 12,
};

const initialOrigin = {
  name: '',
  company: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
};

type ShippingOriginAddress = typeof initialOrigin;

export default function ShippingSettingsPage() {
  const [shippingDefaults, setShippingDefaults] = useState<Record<string, ShippingDefaultValues>>(
    {}
  );
  const [originAddress, setOriginAddress] = useState<ShippingOriginAddress>(initialOrigin);
  const [enabledCarriers, setEnabledCarriers] = useState<string[]>([]);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [isSavingOrigin, setIsSavingOrigin] = useState(false);
  const [isSavingCarriers, setIsSavingCarriers] = useState(false);
  const [message, setMessage] = useState('');
  const [originMessage, setOriginMessage] = useState('');
  const [carriersMessage, setCarriersMessage] = useState('');
  const [isDefaultsModalOpen, setIsDefaultsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [defaultsDraft, setDefaultsDraft] = useState<ShippingDefaultValues | null>(null);
  const [isOriginModalOpen, setIsOriginModalOpen] = useState(false);
  const [originDraft, setOriginDraft] = useState<ShippingOriginAddress>(initialOrigin);

  const categoryMap = useMemo(
    () => new Map(SHIPPING_CATEGORIES.map((category) => [category.key, category.label])),
    []
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const [defaultsResponse, originResponse, carriersResponse] = await Promise.all([
          fetch('/api/admin/shipping/defaults'),
          fetch('/api/admin/shipping/origin'),
          fetch('/api/admin/shipping/carriers'),
        ]);

        const defaultsData = await defaultsResponse.json();
        const map: Record<string, ShippingDefaultValues> = {};
        for (const entry of defaultsData.defaults || []) {
          map[entry.category] = {
            shipping_cost_cents: entry.shipping_cost_cents ?? 0,
            default_weight_oz: entry.default_weight_oz ?? defaultPackage.default_weight_oz,
            default_length_in: entry.default_length_in ?? defaultPackage.default_length_in,
            default_width_in: entry.default_width_in ?? defaultPackage.default_width_in,
            default_height_in: entry.default_height_in ?? defaultPackage.default_height_in,
          };
        }
        setShippingDefaults(map);

        const originData = await originResponse.json();
        if (originData.origin) {
          setOriginAddress(originData.origin);
        }

        const carriersData = await carriersResponse.json();
        setEnabledCarriers(carriersData.carriers || []);
      } catch (error) {
        logError(error, { layer: 'frontend', event: 'admin_load_settings_shipping' });
      }
    };

    loadData();
  }, []);

  const openDefaultsModal = (categoryKey: string) => {
    const current = shippingDefaults[categoryKey] ?? defaultPackage;
    setActiveCategory(categoryKey);
    setDefaultsDraft({ ...current });
    setIsDefaultsModalOpen(true);
    setMessage('');
  };

  const openOriginModal = () => {
    setOriginDraft({ ...originAddress });
    setIsOriginModalOpen(true);
    setOriginMessage('');
  };

  const handleDraftChange = (field: keyof ShippingDefaultValues, value: string) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;
    setDefaultsDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: field === 'shipping_cost_cents' ? numericValue * 100 : numericValue,
      };
    });
  };

  const handleOriginDraftChange = (field: keyof ShippingOriginAddress, value: string) => {
    setOriginDraft((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCarrier = (carrierKey: string) => {
    setEnabledCarriers((prev) => {
      if (prev.includes(carrierKey)) {
        return prev.filter((c) => c !== carrierKey);
      }
      return [...prev, carrierKey];
    });
  };

  const saveDefaults = async () => {
    if (!activeCategory || !defaultsDraft) return;
    setIsSavingDefaults(true);
    setMessage('');

    const nextDefaults: Record<string, ShippingDefaultValues> = {
      ...shippingDefaults,
      [activeCategory]: defaultsDraft,
    };

    try {
      const defaults = SHIPPING_CATEGORIES.map((category) => ({
        category: category.key,
        shipping_cost_cents: Math.round(nextDefaults[category.key]?.shipping_cost_cents ?? 0),
        default_weight_oz:
          nextDefaults[category.key]?.default_weight_oz ?? defaultPackage.default_weight_oz,
        default_length_in:
          nextDefaults[category.key]?.default_length_in ?? defaultPackage.default_length_in,
        default_width_in:
          nextDefaults[category.key]?.default_width_in ?? defaultPackage.default_width_in,
        default_height_in:
          nextDefaults[category.key]?.default_height_in ?? defaultPackage.default_height_in,
      }));

      const response = await fetch('/api/admin/shipping/defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaults }),
      });

      if (response.ok) {
        setShippingDefaults(nextDefaults);
        setIsDefaultsModalOpen(false);
        setActiveCategory(null);
        setDefaultsDraft(null);
        setMessage('Shipping defaults updated.');
      } else {
        const errorData = await response.json();
        setMessage(`Failed to update defaults: ${errorData.error}`);
      }
    } catch (error) {
      setMessage('An unexpected error occurred.');
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const saveOrigin = async () => {
    setIsSavingOrigin(true);
    setOriginMessage('');
    try {
      const response = await fetch('/api/admin/shipping/origin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(originDraft),
      });

      if (response.ok) {
        setOriginAddress(originDraft);
        setIsOriginModalOpen(false);
        setOriginMessage('Shipping origin address saved.');
      } else {
        const errorData = await response.json();
        setOriginMessage(`Failed to save address: ${errorData.error}`);
      }
    } catch (error) {
      setOriginMessage('An unexpected error occurred.');
    } finally {
      setIsSavingOrigin(false);
    }
  };

  const saveCarriers = async () => {
    setIsSavingCarriers(true);
    setCarriersMessage('');
    try {
      const response = await fetch('/api/admin/shipping/carriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carriers: enabledCarriers }),
      });

      if (response.ok) {
        setCarriersMessage('Enabled carriers updated.');
        setTimeout(() => setCarriersMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setCarriersMessage(`Failed to save carriers: ${errorData.error}`);
      }
    } catch (error) {
      setCarriersMessage('An unexpected error occurred.');
    } finally {
      setIsSavingCarriers(false);
    }
  };

  const getPackageSummary = (categoryKey: string) => {
    const data = shippingDefaults[categoryKey] ?? defaultPackage;
    const cost = (data.shipping_cost_cents / 100).toFixed(2);
    return {
      cost,
      weight: data.default_weight_oz,
      length: data.default_length_in,
      width: data.default_width_in,
      height: data.default_height_in,
    };
  };

  const originLine = useMemo(() => {
    const parts = [originAddress.line1, originAddress.city, originAddress.state, originAddress.postal_code].filter(Boolean);
    return parts.join(', ');
  }, [originAddress]);

  const activeCategoryLabel = activeCategory ? categoryMap.get(activeCategory) ?? '' : '';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Shipping Settings</h1>
        <p className="text-gray-400">Shipping defaults, origin address, and carrier options</p>
      </div>

      {/* Top row (2 cards) + bottom full-width (default packages) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Origin address</h2>
              <p className="text-sm text-gray-400">Used for labels and rate estimates.</p>
            </div>
            <button
              type="button"
              onClick={openOriginModal}
              className="px-4 py-2 bg-zinc-900 text-white text-sm border border-zinc-800/70 hover:border-zinc-700"
            >
              Edit origin
            </button>
          </div>
          <div className="text-sm text-gray-400">{originLine ? originLine : 'No origin address saved yet.'}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-5 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Enabled Carriers</h2>
            <p className="text-sm text-gray-400 mb-4">Select which carriers to offer for label creation.</p>
          </div>
          <div className="space-y-2">
            {AVAILABLE_CARRIERS.map((carrier) => (
              <label
                key={carrier.key}
                className="flex items-start gap-3 p-3 border border-zinc-800/70 rounded cursor-pointer hover:border-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={enabledCarriers.includes(carrier.key)}
                  onChange={() => toggleCarrier(carrier.key)}
                  className="mt-1 rdk-checkbox"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{carrier.label}</div>
                  <div className="text-xs text-gray-500">{carrier.description}</div>
                </div>
              </label>
            ))}
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={saveCarriers}
              disabled={isSavingCarriers}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded disabled:bg-gray-600"
            >
              {isSavingCarriers ? 'Saving...' : 'Save carriers'}
            </button>
            {carriersMessage && <div className="mt-2 text-sm text-gray-400">{carriersMessage}</div>}
          </div>
        </div>

        {/* Full-width card on lg, placed below the two cards */}
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-5 space-y-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Default packages</h2>
              <p className="text-sm text-gray-400">Configure default cost, weight, and dimensions per category.</p>
            </div>
            {message && <span className="text-sm text-gray-400">{message}</span>}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {SHIPPING_CATEGORIES.map((category) => {
              const summary = getPackageSummary(category.key);
              return (
                <div key={category.key} className="border border-zinc-800/70 rounded p-4 bg-zinc-950/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">{category.label}</div>
                      <div className="text-white font-semibold mt-1">${summary.cost} shipping</div>
                      <div className="text-xs text-gray-400 mt-2">
                        {summary.length} x {summary.width} x {summary.height} in · {summary.weight} oz
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDefaultsModal(category.key)}
                      className="px-3 py-2 text-xs font-semibold bg-zinc-900 text-white border border-zinc-800/70 hover:border-zinc-700"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isDefaultsModalOpen && defaultsDraft && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
          onClick={() => setIsDefaultsModalOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800/70 rounded-lg w-full max-w-2xl p-6 space-y-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Edit package defaults</h3>
                <p className="text-xs text-gray-500">{activeCategoryLabel} defaults</p>
              </div>
              <button type="button" onClick={() => setIsDefaultsModalOpen(false)} className="text-gray-400 hover:text-white">
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Package size</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Length (in)</label>
                    <input
                      type="number"
                      value={defaultsDraft.default_length_in}
                      onChange={(e) => handleDraftChange('default_length_in', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Width (in)</label>
                    <input
                      type="number"
                      value={defaultsDraft.default_width_in}
                      onChange={(e) => handleDraftChange('default_width_in', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Height (in)</label>
                    <input
                      type="number"
                      value={defaultsDraft.default_height_in}
                      onChange={(e) => handleDraftChange('default_height_in', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Weight (oz)</label>
                  <input
                    type="number"
                    value={defaultsDraft.default_weight_oz}
                    onChange={(e) => handleDraftChange('default_weight_oz', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Shipping cost ($)</label>
                  <input
                    type="number"
                    value={(defaultsDraft.shipping_cost_cents / 100).toFixed(2)}
                    onChange={(e) => handleDraftChange('shipping_cost_cents', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDefaultsModalOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDefaults}
                disabled={isSavingDefaults}
                className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 disabled:bg-gray-600"
              >
                {isSavingDefaults ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isOriginModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
          onClick={() => setIsOriginModalOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800/70 rounded-lg w-full max-w-2xl p-6 space-y-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Edit origin</h3>
                <p className="text-xs text-gray-500">Shipping origin address</p>
              </div>
              <button type="button" onClick={() => setIsOriginModalOpen(false)} className="text-gray-400 hover:text-white">
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Contact name</label>
                <input
                  type="text"
                  value={originDraft.name}
                  onChange={(e) => handleOriginDraftChange('name', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">Company</label>
                <input
                  type="text"
                  value={originDraft.company ?? ''}
                  onChange={(e) => handleOriginDraftChange('company', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-400 text-xs mb-1">Phone number</label>
                <input
                  type="text"
                  value={originDraft.phone}
                  onChange={(e) => handleOriginDraftChange('phone', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-400 text-xs mb-1">Street address</label>
                <input
                  type="text"
                  value={originDraft.line1}
                  onChange={(e) => handleOriginDraftChange('line1', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-400 text-xs mb-1">Apartment, suite, etc.</label>
                <input
                  type="text"
                  value={originDraft.line2 ?? ''}
                  onChange={(e) => handleOriginDraftChange('line2', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">City</label>
                <input
                  type="text"
                  value={originDraft.city}
                  onChange={(e) => handleOriginDraftChange('city', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">State</label>
                <input
                  type="text"
                  value={originDraft.state}
                  onChange={(e) => handleOriginDraftChange('state', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">ZIP / Postal code</label>
                <input
                  type="text"
                  value={originDraft.postal_code}
                  onChange={(e) => handleOriginDraftChange('postal_code', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">Country</label>
                <input
                  type="text"
                  value={originDraft.country}
                  onChange={(e) => handleOriginDraftChange('country', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {originMessage && <span className="text-sm text-gray-400">{originMessage}</span>}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsOriginModalOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveOrigin}
                  disabled={isSavingOrigin}
                  className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 disabled:bg-gray-600"
                >
                  {isSavingOrigin ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
