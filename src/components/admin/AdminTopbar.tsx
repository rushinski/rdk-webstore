// src/components/admin/AdminTopbar.tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function AdminTopbar() {
  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Real Deal Kickz Admin</h1>
        <Link 
          href="/" 
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </Link>
      </div>
    </div>
  );
}