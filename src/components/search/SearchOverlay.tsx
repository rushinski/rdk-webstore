// src/components/search/SearchOverlay.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { logError } from '@/lib/log';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/store/products?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        setResults(data.products || []);
      } catch (error) {
        logError(error, { layer: "frontend", event: "search_overlay_error" });
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/store?q=${encodeURIComponent(query)}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Search</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for sneakers, brands..."
              className="w-full bg-zinc-900 text-white px-4 py-3 rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-red-600"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        {isLoading && (
          <p className="text-gray-400 text-center">Searching...</p>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-gray-400 text-sm mb-3">Likely matches</p>
            {results.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  router.push(`/store/${product.id}`);
                  onClose();
                }}
                className="w-full flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 p-3 rounded transition text-left"
              >
                <div className="w-16 h-16 relative flex-shrink-0">
                  <Image
                    src={product.images[0]?.url || '/placeholder.png'}
                    alt={product.title_display ?? product.name}
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">
                    {product.title_display ?? `${product.brand} ${product.name}`.trim()}
                  </h3>
                </div>
                <div className="text-white font-bold">
                  ${(product.variants[0]?.price_cents / 100).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        )}

        {query && !isLoading && results.length === 0 && (
          <p className="text-gray-400 text-center">No matches found</p>
        )}
      </div>
    </div>
  );
}
