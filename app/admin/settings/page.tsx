// app/admin/settings/page.tsx

export default function SettingsPage() {
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
            <div>
              <label className="block text-gray-400 text-sm mb-1">Sneakers Shipping ($)</label>
              <input
                type="number"
                defaultValue="10"
                step="0.01"
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Clothing Shipping ($)</label>
              <input
                type="number"
                defaultValue="8"
                step="0.01"
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20"
              />
            </div>
          </div>
          <button className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded transition">
            Save Defaults
          </button>
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