// app/admin/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { logError } from '@/lib/log';

const SHIPPING_CATEGORIES = [
  { key: 'sneakers', label: 'Sneakers' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'electronics', label: 'Electronics' },
];

type ShippingDefaultValues = {
  shipping_cost_cents: number;
  default_weight_oz: number;
  default_length_in: number;
  default_width_in: number;
  default_height_in: number;
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

export default function SettingsPage() {
  const [shippingDefaults, setShippingDefaults] = useState<Record<string, ShippingDefaultValues>>({});
  const [originAddress, setOriginAddress] = useState<ShippingOriginAddress>(initialOrigin);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingOrigin, setIsSavingOrigin] = useState(false);
  const [message, setMessage] = useState('');
  const [originMessage, setOriginMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [defaultsResponse, originResponse] = await Promise.all([
            fetch('/api/admin/shipping/defaults'),
            fetch('/api/admin/shipping/origin'),
        ]);

        // Load Defaults
        const defaultsData = await defaultsResponse.json();
        const map: Record<string, ShippingDefaultValues> = {};
        for (const entry of defaultsData.defaults || []) {
          map[entry.category] = {
            shipping_cost_cents: entry.shipping_cost_cents ?? 0,
            default_weight_oz: entry.default_weight_oz ?? 16,
            default_length_in: entry.default_length_in ?? 12,
            default_width_in: entry.default_width_in ?? 12,
            default_height_in: entry.default_height_in ?? 12,
          };
        }
        setShippingDefaults(map);

        // Load Origin
        const originData = await originResponse.json();
        if (originData.origin) {
            setOriginAddress(originData.origin);
        }

      } catch (error) {
        logError(error, { layer: 'frontend', event: 'admin_load_settings' });
      }
    };

    loadData();
  }, []);

  const handleValueChange = (category: string, field: keyof ShippingDefaultValues, value: string) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;

    setShippingDefaults((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: field === 'shipping_cost_cents' ? numericValue * 100 : numericValue,
      },
    }));
  };

  const handleSaveDefaults = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const defaults = SHIPPING_CATEGORIES.map((category) => ({
        category: category.key,
        shipping_cost_cents: Math.round(shippingDefaults[category.key]?.shipping_cost_cents ?? 0),
        default_weight_oz: shippingDefaults[category.key]?.default_weight_oz ?? 16,
        default_length_in: shippingDefaults[category.key]?.default_length_in ?? 12,
        default_width_in: shippingDefaults[category.key]?.default_width_in ?? 12,
        default_height_in: shippingDefaults[category.key]?.default_height_in ?? 12,
      }));

      const response = await fetch('/api/admin/shipping/defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaults }),
      });

      if (response.ok) {
        setMessage('Shipping defaults updated.');
      } else {
        const errorData = await response.json();
        setMessage(`Failed to update defaults: ${errorData.error}`);
      }
    } catch (error) {
      setMessage('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOriginChange = (field: keyof ShippingOriginAddress, value: string) => {
    setOriginAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveOrigin = async () => {
    setIsSavingOrigin(true);
    setOriginMessage('');
    try {
        const response = await fetch('/api/admin/shipping/origin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(originAddress),
        });

        if (response.ok) {
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

  const getFieldValue = (category: string, field: keyof ShippingDefaultValues) => {
    const value = shippingDefaults[category]?.[field];
    if (value === undefined) return '';
    if (field === 'shipping_cost_cents') {
      return (value / 100).toFixed(2);
    }
    return value;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your store settings</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Shipping Origin</h2>
        <p className="text-gray-400 mb-6">
          Set the address where you will be shipping orders from.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-gray-400 text-sm mb-1">Contact Name</label>
                <input type="text" value={originAddress.name} onChange={e => handleOriginChange('name', e.target.value)} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
            </div>
            <div>
                <label className="block text-gray-400 text-sm mb-1">Company</label>
                <input type="text" value={originAddress.company ?? ''} onChange={e => handleOriginChange('company', e.target.value)} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
            </div>
            <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-1">Phone Number</label>
                <input type="text" value={originAddress.phone} onChange={e => handleOriginChange('phone', e.target.value)} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
            </div>
            <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-1">Street Address</label>
                <input type="text" value={originAddress.line1} onChange={e => handleOriginChange('line1', e.target.value)} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
            </div>
            <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-1">Apartment, suite, etc.</label>
                <input type="text" value={originAddress.line2 ?? ''} onChange={e => handleOriginChange('line2', e.target.value)} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
            </div>
            <div>
                <label className="block text-gray-400 text-sm mb-1">City</label>
                <input type="text" value={originAddress.city} onChange={e => handleOriginChange('city', e.target.value)} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
            </div>
            <div>
                <label className="block text-gray-400 text-sm mb-1">State</label>
                <input type="text" value={originAddress.state} onChange={e => handleOriginChange('state', e.target.value)} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
            </div>
            <div>
                <label className="block text-gray-400 text-sm mb-1">ZIP / Postal Code</label>
                <input type="text" value={originAddress.postal_code} onChange={e => handleOriginChange('postal_code', e.target.value)} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
            </div>
             <div>
                <label className="block text-gray-400 text-sm mb-1">Country</label>
                <input type="text" value={originAddress.country} onChange={e => handleOriginChange('country', e.target.value)} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
            </div>
        </div>
        <div className="mt-6 flex items-center gap-3">
            <button onClick={handleSaveOrigin} disabled={isSavingOrigin} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition">
                {isSavingOrigin ? 'Saving...' : 'Save Origin Address'}
            </button>
            {originMessage && <span className="text-gray-400 text-sm">{originMessage}</span>}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Shipping Defaults</h2>
        <p className="text-gray-400 mb-6">
          Set default shipping thresholds and package dimensions for each product category.
        </p>

        <div className="space-y-8">
          {SHIPPING_CATEGORIES.map((category) => (
            <div key={category.key} className="border-b border-zinc-800/70 pb-8 last:border-b-0 last:pb-0">
              <h3 className="text-lg font-medium text-white mb-4">{category.label}</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Shipping Cost ($)</label>
                  <input
                    type="number"
                    value={getFieldValue(category.key, 'shipping_cost_cents')}
                    onChange={(e) => handleValueChange(category.key, 'shipping_cost_cents', e.target.value)}
                    className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Weight (oz)</label>
                  <input
                    type="number"
                    value={getFieldValue(category.key, 'default_weight_oz')}
                    onChange={(e) => handleValueChange(category.key, 'default_weight_oz', e.target.value)}
                    className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Length (in)</label>
                  <input
                    type="number"
                    value={getFieldValue(category.key, 'default_length_in')}
                    onChange={(e) => handleValueChange(category.key, 'default_length_in', e.target.value)}
                    className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Width (in)</label>
                  <input
                    type="number"
                    value={getFieldValue(category.key, 'default_width_in')}
                    onChange={(e) => handleValueChange(category.key, 'default_width_in', e.target.value)}
                    className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Height (in)</label>
                  <input
                    type="number"
                    value={getFieldValue(category.key, 'default_height_in')}
                    onChange={(e) => handleValueChange(category.key, 'default_height_in', e.target.value)}
                    className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleSaveDefaults}
            disabled={isSaving}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
          >
            {isSaving ? 'Saving...' : 'Save All Defaults'}
          </button>
          {message && <span className="text-gray-400 text-sm">{message}</span>}
        </div>
      </div>
    </div>
  );
}
