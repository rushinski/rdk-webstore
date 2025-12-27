'use client';

import { useEffect, useState } from 'react';

const SHIPPING_CATEGORIES = [
  { key: 'sneakers', label: 'Sneakers' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'electronics', label: 'Electronics' },
];

export default function SettingsPage() {
  const [shippingDefaults, setShippingDefaults] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const response = await fetch('/api/admin/shipping/defaults');
        const data = await response.json();
        const map: Record<string, string> = {};
        for (const entry of data.defaults || []) {
          map[entry.category] = Number(entry.default_price ?? 0).toFixed(2);
        }
        setShippingDefaults(map);
      } catch (error) {
        console.error('Load shipping defaults error:', error);
      }
    };

    loadDefaults();
  }, []);

  const handleSaveDefaults = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const defaults = SHIPPING_CATEGORIES.map((category) => ({
        category: category.key,
        default_price: Number(shippingDefaults[category.key] ?? 0),
      }));

      const response = await fetch('/api/admin/shipping/defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaults }),
      });

      if (response.ok) {
        setMessage('Shipping defaults updated.');
      } else {
        setMessage('Failed to update defaults.');
      }
    } catch (error) {
      setMessage('Failed to update defaults.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your store settings</p>
      </div>

      <div className="space-y-4">
        <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Payout Setup</h2>
          <p className="text-gray-400 mb-4">
            Connect your bank account to receive payouts
          </p>
          <button className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded transition">
            Connect Bank Account
          </button>
        </div>

        <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Shipping Defaults</h2>
          <p className="text-gray-400 mb-4">
            Set default shipping costs for different product types
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SHIPPING_CATEGORIES.map((category) => (
              <div key={category.key}>
                <label className="block text-gray-400 text-sm mb-1">
                  {category.label} Shipping ($)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={shippingDefaults[category.key] ?? ''}
                  onChange={(e) =>
                    setShippingDefaults((prev) => ({ ...prev, [category.key]: e.target.value }))
                  }
                  className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSaveDefaults}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
            >
              {isSaving ? 'Saving...' : 'Save Defaults'}
            </button>
            {message && <span className="text-gray-400 text-sm">{message}</span>}
          </div>
        </div>

        <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Store Information</h2>
          <p className="text-gray-400 mb-4">
            Update your store name, description, and contact info
          </p>
          <button className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded transition">
            Edit Store Info
          </button>
        </div>
      </div>
    </div>
  );
}
