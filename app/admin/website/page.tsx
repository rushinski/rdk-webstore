// app/admin/website/page.tsx

export default function WebsitePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Website</h1>
        <p className="text-gray-400">Manage your storefront content and pages</p>
      </div>

      <div className="bg-zinc-900 border border-red-900/20 rounded p-12 text-center">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Website Management
        </h2>
        <p className="text-gray-400 mb-6">
          Content management features coming soon
        </p>
      </div>
    </div>
  );
}