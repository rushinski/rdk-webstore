// src/components/admin/AdminTopbar.tsx

import Link from 'next/link';

export function AdminTopbar() {
  return (
    <div className="bg-zinc-900 border-b border-red-900/20 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Real Deal Kickz Admin</h1>
        <Link href="/" className="text-gray-400 hover:text-white text-sm">
          ← Back to Store
        </Link>
      </div>
    </div>
  );
}