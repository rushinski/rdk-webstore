'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Plus, Trash2, MoreVertical, Search } from 'lucide-react';
import type { ProductWithDetails } from "@/types/views/product";
import type { Category, Condition } from "@/types/views/product";
import { logError } from '@/lib/log';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import { RdkSelect } from '@/components/ui/Select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type StockStatus = 'in_stock' | 'out_of_stock';

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<Condition | 'all'>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatus>('in_stock');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [pendingMassDelete, setPendingMassDelete] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null);
  const filtersRef = useRef<{
    q?: string;
    category?: Category | 'all';
    condition?: Condition | 'all';
    stockStatus?: StockStatus;
  }>({});
  const refreshTimerRef = useRef<number | null>(null);

  const loadProducts = useCallback(
    async (
      filters?: {
        q?: string;
        category?: Category | 'all';
        condition?: Condition | 'all';
        stockStatus?: StockStatus;
      },
      showLoading = true
    ) => {
      if (showLoading) setIsLoading(true);
      try {
        // Admin list must include out-of-stock so the admin tabs can display them.
        const params = new URLSearchParams({ limit: '100', includeOutOfStock: '1' });

        if (filters?.q) params.set('q', filters.q.trim());
        if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
        if (filters?.condition && filters.condition !== 'all') params.append('condition', filters.condition);

        const response = await fetch(`/api/admin/products?${params.toString()}`);
        const data = await response.json();

        const loaded: ProductWithDetails[] = data.products || [];

        // Client-side tab filter based on actual variant stock (authoritative for admin UI)
        const filtered = filters?.stockStatus
          ? loaded.filter((product: ProductWithDetails) => {
              const totalStock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
              if (filters.stockStatus === 'out_of_stock') return totalStock <= 0;
              return totalStock > 0;
            })
          : loaded;

        setProducts(filtered);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_inventory_products" });
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    filtersRef.current = {
      q: searchQuery,
      category: categoryFilter,
      condition: conditionFilter,
      stockStatus: stockStatusFilter,
    };

    const timeout = setTimeout(() => {
      loadProducts(filtersRef.current);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, categoryFilter, conditionFilter, stockStatusFilter, loadProducts]);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const activeMenus = Array.from(document.querySelectorAll(`[data-menu-id="${openMenuId}"]`));
      if (target && activeMenus.some((menu) => menu.contains(target))) return;
      setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = window.setTimeout(() => {
        loadProducts(filtersRef.current, false);
      }, 300);
    };

    const channel = supabase
      .channel('admin-inventory')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_variants' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [loadProducts]);

  const showToast = (message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, tone });
  };

  const requestDelete = (product: ProductWithDetails) => {
    setOpenMenuId(null);
    const label = product.title_display ?? `${product.brand} ${product.name}`.trim();
    setPendingDelete({ id: product.id, label: label || 'this product' });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id, label } = pendingDelete;
    setPendingDelete(null);

    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast(`Deleted ${label}.`, 'success');
        await loadProducts({
          q: searchQuery,
          category: categoryFilter,
          condition: conditionFilter,
          stockStatus: stockStatusFilter,
        });
      } else {
        showToast('Failed to delete product.', 'error');
      }
    } catch {
      showToast('Error deleting product.', 'error');
    }
  };

  const confirmMassDelete = async () => {
    setPendingMassDelete(false);
    if (selectedIds.length === 0) return;

    try {
      const results = await Promise.all(
        selectedIds.map((id) => fetch(`/api/admin/products/${id}`, { method: 'DELETE' }))
      );
      const failed = results.filter((res) => !res.ok).length;

      if (failed > 0) showToast(`Deleted ${selectedIds.length - failed} items, ${failed} failed.`, 'error');
      else showToast(`Deleted ${selectedIds.length} items.`, 'success');

      setSelectedIds([]);
      await loadProducts({
        q: searchQuery,
        category: categoryFilter,
        condition: conditionFilter,
        stockStatus: stockStatusFilter,
      });
    } catch {
      showToast('Error deleting selected items.', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    setOpenMenuId(null);
    try {
      const response = await fetch(`/api/admin/products/${id}/duplicate`, { method: 'POST' });
      if (response.ok) {
        showToast('Product duplicated.', 'success');
        await loadProducts({
          q: searchQuery,
          category: categoryFilter,
          condition: conditionFilter,
          stockStatus: stockStatusFilter,
        });
      } else {
        showToast('Failed to duplicate product.', 'error');
      }
    } catch {
      showToast('Error duplicating product.', 'error');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleMassDelete = () => {
    if (selectedIds.length === 0) return;
    setPendingMassDelete(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Inventory</h1>
          <p className="text-gray-400">{products.length} products</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/inventory/create"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 transition cursor-pointer rounded"
          >
            <Plus className="w-5 h-5" />
            Create Product
          </Link>
        </div>
      </div>

      <div className="border-b border-zinc-800/70 flex space-x-6">
        <button
          onClick={() => setStockStatusFilter('in_stock')}
          className={`py-3 text-sm font-medium transition-colors ${
            stockStatusFilter === 'in_stock'
              ? 'text-white border-b-2 border-red-600'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          In Stock
        </button>
        <button
          onClick={() => setStockStatusFilter('out_of_stock')}
          className={`py-3 text-sm font-medium transition-colors ${
            stockStatusFilter === 'out_of_stock'
              ? 'text-white border-b-2 border-red-600'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Out of Stock
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/70 px-3 py-2 w-full lg:max-w-md rounded
                        focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-zinc-700/40">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search products"
            className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none
                       focus:outline-none focus-visible:outline-none focus-visible:ring-0"
          />
        </div>

        {/* Red-highlight custom dropdowns */}
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-56">
            <RdkSelect
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(v as Category | 'all')}
              options={[
                { value: 'all', label: 'All categories' },
                { value: 'sneakers', label: 'Sneakers' },
                { value: 'clothing', label: 'Clothing' },
                { value: 'accessories', label: 'Accessories' },
                { value: 'electronics', label: 'Electronics' },
              ]}
            />
          </div>

          <div className="w-full sm:w-48">
            <RdkSelect
              value={conditionFilter}
              onChange={(v) => setConditionFilter(v as Condition | 'all')}
              options={[
                { value: 'all', label: 'All conditions' },
                { value: 'new', label: 'New' },
                { value: 'used', label: 'Used' },
              ]}
            />
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 flex items-center justify-between">
          <span className="text-white">{selectedIds.length} selected</span>
          <button
            onClick={handleMassDelete}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-zinc-900 border border-zinc-800/70 rounded overflow-visible relative">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-12" />
                <col className="w-20" />
                <col />
                <col className="w-36" />
                <col className="w-44" />
                <col className="w-20" />
                <col className="w-20" />
              </colgroup>

              <thead>
                <tr className="border-b border-zinc-800/70 bg-zinc-800">
                  <th className="text-left px-4 py-3">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(products.map((p) => p.id));
                        else setSelectedIds([]);
                      }}
                      checked={selectedIds.length === products.length && products.length > 0}
                    />
                  </th>
                  <th className="text-left text-gray-400 font-semibold px-4 py-3">Image</th>
                  <th className="text-left text-gray-400 font-semibold px-4 py-3">Product</th>
                  <th className="text-left text-gray-400 font-semibold px-4 py-3">Category</th>
                  <th className="text-left text-gray-400 font-semibold px-4 py-3">Price</th>
                  <th className="text-left text-gray-400 font-semibold px-4 py-3">Stock</th>
                  <th className="text-right text-gray-400 font-semibold px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const minPrice = Math.min(...product.variants.map((v) => v.price_cents));
                  const maxPrice = Math.max(...product.variants.map((v) => v.price_cents));
                  const totalStock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
                  const primaryImage = product.images.find((image) => image.is_primary) ?? product.images[0];

                  return (
                    <tr key={product.id} className="border-b border-zinc-800/70 hover:bg-zinc-800">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rdk-checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelection(product.id)}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="w-12 h-12 rounded bg-zinc-800 border border-zinc-800/70 overflow-hidden flex items-center justify-center">
                          {primaryImage?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={primaryImage.url}
                              alt={product.title_display ?? product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-gray-500">No image</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 min-w-0">
                        <div className="text-white font-semibold truncate">
                          {product.title_display ?? `${product.brand} ${product.name}`.trim()}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-400 capitalize truncate">{product.category}</td>

                      <td className="px-4 py-3 text-white whitespace-nowrap">
                        {minPrice === maxPrice
                          ? `$${(minPrice / 100).toFixed(2)}`
                          : `$${(minPrice / 100).toFixed(2)} - $${(maxPrice / 100).toFixed(2)}`}
                      </td>

                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{totalStock}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <div className="relative" data-menu-id={product.id}>
                            <button
                              type="button"
                              onClick={() => setOpenMenuId((prev) => (prev === product.id ? null : product.id))}
                              className="text-gray-400 hover:text-white p-2 rounded hover:bg-zinc-900 cursor-pointer"
                              aria-label="Open actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === product.id && (
                              <div className="absolute right-0 mt-2 w-44 bg-zinc-950 border border-zinc-800/70 shadow-xl z-30 rounded overflow-hidden">
                                <Link
                                  href={`/admin/inventory/${product.id}/edit`}
                                  onClick={() => setOpenMenuId(null)}
                                  className="block px-3 py-2 text-sm text-gray-200 hover:bg-zinc-800"
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(product.id)}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-zinc-800 cursor-pointer"
                                >
                                  Duplicate
                                </button>
                                <div className="h-px bg-zinc-800/70" />
                                <button
                                  type="button"
                                  onClick={() => requestDelete(product)}
                                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (unchanged layout) */}
          <div className="md:hidden space-y-4">
            {products.map((product) => {
              const primaryImage = product.images.find((image) => image.is_primary) ?? product.images[0];
              const totalStock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);

              return (
                <div key={product.id} className="bg-zinc-900 border border-zinc-800/70 rounded p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded bg-zinc-800 border border-zinc-800/70 overflow-hidden flex items-center justify-center">
                      {primaryImage?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={primaryImage.url}
                          alt={product.title_display ?? product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-500">No image</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-white font-semibold">
                        {product.title_display ?? `${product.brand} ${product.name}`.trim()}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-gray-400 text-xs capitalize">{product.category}</span>
                        <span className="text-gray-500 text-xs">•</span>
                        <span className="text-gray-400 text-xs">Stock: {totalStock}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <input
                        type="checkbox"
                        className="rdk-checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelection(product.id)}
                      />

                      <div className="relative" data-menu-id={product.id}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((prev) => (prev === product.id ? null : product.id))}
                          className="text-gray-400 hover:text-white p-2 rounded hover:bg-zinc-800 cursor-pointer"
                          aria-label="Open actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === product.id && (
                          <div className="absolute right-0 mt-2 w-44 bg-zinc-950 border border-zinc-800/70 shadow-xl z-30 rounded overflow-hidden">
                            <Link
                              href={`/admin/inventory/${product.id}/edit`}
                              onClick={() => setOpenMenuId(null)}
                              className="block px-3 py-2 text-sm text-gray-200 hover:bg-zinc-800"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(product.id)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-zinc-800 cursor-pointer"
                            >
                              Duplicate
                            </button>
                            <div className="h-px bg-zinc-800/70" />
                            <button
                              type="button"
                              onClick={() => requestDelete(product)}
                              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete product?"
        description={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.label} and its variants.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        isOpen={pendingMassDelete}
        title="Delete selected products?"
        description={`This will permanently remove ${selectedIds.length} products and their variants.`}
        confirmLabel="Delete all"
        onConfirm={confirmMassDelete}
        onCancel={() => setPendingMassDelete(false)}
      />

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        tone={toast?.tone ?? 'info'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
