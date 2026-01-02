// app/admin/inventory/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, MoreVertical, Search } from 'lucide-react';
import type { ProductWithDetails } from "@/types/views/product";
import type { Category, Condition } from "@/types/views/product";
import { logError } from '@/lib/log';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';

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

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadProducts({
        q: searchQuery,
        category: categoryFilter,
        condition: conditionFilter,
        stockStatus: stockStatusFilter,
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, categoryFilter, conditionFilter, stockStatusFilter]);

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

  const loadProducts = async (filters?: {
    q?: string;
    category?: Category | 'all';
    condition?: Condition | 'all';
    stockStatus?: StockStatus;
  }) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filters?.q) {
        params.set('q', filters.q.trim());
      }
      if (filters?.category && filters.category !== 'all') {
        params.append('category', filters.category);
      }
      if (filters?.condition && filters.condition !== 'all') {
        params.append('condition', filters.condition);
      }
      if (filters?.stockStatus) {
        params.set('stockStatus', filters.stockStatus);
      }

      const response = await fetch(`/api/store/products?${params.toString()}`);
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_inventory_products" });
    } finally {
      setIsLoading(false);
    }
  };

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
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast(`Deleted ${label}.`, 'success');
        await loadProducts({
          q: searchQuery,
          category: categoryFilter,
          condition: conditionFilter,
        });
      } else {
        showToast('Failed to delete product.', 'error');
      }
    } catch (error) {
      showToast('Error deleting product.', 'error');
    }
  };

  const confirmMassDelete = async () => {
    setPendingMassDelete(false);
    if (selectedIds.length === 0) return;

    try {
      const results = await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
        )
      );
      const failed = results.filter((res) => !res.ok).length;
      if (failed > 0) {
        showToast(`Deleted ${selectedIds.length - failed} items, ${failed} failed.`, 'error');
      } else {
        showToast(`Deleted ${selectedIds.length} items.`, 'success');
      }
      setSelectedIds([]);
      await loadProducts({
        q: searchQuery,
        category: categoryFilter,
        condition: conditionFilter,
      });
    } catch (error) {
      showToast('Error deleting selected items.', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    setOpenMenuId(null);
    try {
      const response = await fetch(`/api/admin/products/${id}/duplicate`, {
        method: 'POST',
      });

      if (response.ok) {
        showToast('Product duplicated.', 'success');
        await loadProducts({
          q: searchQuery,
          category: categoryFilter,
          condition: conditionFilter,
        });
      } else {
        showToast('Failed to duplicate product.', 'error');
      }
    } catch (error) {
      showToast('Error duplicating product.', 'error');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
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
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Create Product
          </Link>
        </div>
      </div>

      <div className="border-b border-zinc-800/70 flex space-x-6">
        <button onClick={() => setStockStatusFilter('in_stock')} className={`py-3 text-sm font-medium transition-colors ${stockStatusFilter === 'in_stock' ? 'text-white border-b-2 border-red-600' : 'text-gray-400 hover:text-white'}`}>
            In Stock
        </button>
        <button onClick={() => setStockStatusFilter('out_of_stock')} className={`py-3 text-sm font-medium transition-colors ${stockStatusFilter === 'out_of_stock' ? 'text-white border-b-2 border-red-600' : 'text-gray-400 hover:text-white'}`}>
            Out of Stock
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/70 px-3 py-2 w-full lg:max-w-md">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search products"
            className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
          />
        </div>
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as Category | 'all')}
            className="w-full sm:w-48 bg-zinc-900 border border-zinc-800/70 px-3 py-2 text-sm text-white cursor-pointer"
          >
            <option value="all">All categories</option>
            <option value="sneakers">Sneakers</option>
            <option value="clothing">Clothing</option>
            <option value="accessories">Accessories</option>
            <option value="electronics">Electronics</option>
          </select>
          <select
            value={conditionFilter}
            onChange={(event) => setConditionFilter(event.target.value as Condition | 'all')}
            className="w-full sm:w-40 bg-zinc-900 border border-zinc-800/70 px-3 py-2 text-sm text-white cursor-pointer"
          >
            <option value="all">All conditions</option>
            <option value="new">New</option>
            <option value="used">Used</option>
          </select>
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/70 bg-zinc-800">
                  <th className="text-left p-4">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(products.map((p) => p.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      checked={selectedIds.length === products.length && products.length > 0}
                    />
                  </th>
                  <th className="text-left text-gray-400 font-semibold p-4">Image</th>
                  <th className="text-left text-gray-400 font-semibold p-4">Product</th>
                  <th className="text-left text-gray-400 font-semibold p-4">Category</th>
                  <th className="text-left text-gray-400 font-semibold p-4">Price</th>
                  <th className="text-left text-gray-400 font-semibold p-4">Stock</th>
                  <th className="text-right text-gray-400 font-semibold p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const minPrice = Math.min(...product.variants.map((v) => v.price_cents));
                  const maxPrice = Math.max(...product.variants.map((v) => v.price_cents));
                  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                  const primaryImage =
                    product.images.find((image) => image.is_primary) ?? product.images[0];

                  return (
                    <tr key={product.id} className="border-b border-zinc-800/70 hover:bg-zinc-800">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          className="rdk-checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelection(product.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="w-12 h-12 bg-zinc-800 border border-zinc-800/70 overflow-hidden flex items-center justify-center">
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
                      <td className="p-4">
                        <div>
                          <div className="text-white font-semibold">
                            {product.title_display ?? `${product.brand} ${product.name}`.trim()}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-400 capitalize">{product.category}</td>
                      <td className="p-4 text-white">
                        {minPrice === maxPrice
                          ? `$${(minPrice / 100).toFixed(2)}`
                          : `$${(minPrice / 100).toFixed(2)} - $${(maxPrice / 100).toFixed(2)}`}
                      </td>
                      <td className="p-4 text-gray-400">{totalStock}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end">
                          <div className="relative" data-menu-id={product.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === product.id ? null : product.id))
                              }
                              className="text-gray-400 hover:text-white p-1 cursor-pointer"
                              aria-label="Open actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === product.id && (
                              <div className="absolute right-0 mt-2 w-40 bg-zinc-950 border border-zinc-800/70 shadow-xl z-30">
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

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {products.map((product) => {
              const primaryImage =
                product.images.find((image) => image.is_primary) ?? product.images[0];

              return (
                <div key={product.id} className="bg-zinc-900 border border-zinc-800/70 rounded p-4">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 bg-zinc-800 border border-zinc-800/70 overflow-hidden flex items-center justify-center">
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
                    <span className="text-gray-400 text-xs capitalize">{product.category}</span>
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
                        onClick={() =>
                          setOpenMenuId((prev) => (prev === product.id ? null : product.id))
                        }
                        className="text-gray-400 hover:text-white p-1 cursor-pointer"
                        aria-label="Open actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === product.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-zinc-950 border border-zinc-800/70 shadow-xl z-30">
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
