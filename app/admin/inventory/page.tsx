// app/admin/inventory/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, MoreVertical, Edit, Trash2, Copy } from 'lucide-react';
import type { ProductWithDetails } from "@/types/views/product";

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/store/products?limit=100');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Load products error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadProducts();
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      alert('Error deleting product');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/products/${id}/duplicate`, {
        method: 'POST',
      });

      if (response.ok) {
        loadProducts();
      } else {
        alert('Failed to duplicate product');
      }
    } catch (error) {
      alert('Error duplicating product');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleMassDelete = () => {
    alert('Mass delete functionality - coming soon');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Inventory</h1>
          <p className="text-gray-400">{products.length} products</p>
        </div>
        <Link
          href="/admin/inventory/create"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded transition"
        >
          <Plus className="w-5 h-5" />
          Create Product
        </Link>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-zinc-900 border border-red-900/20 rounded p-4 flex items-center justify-between">
          <span className="text-white">{selectedIds.length} selected</span>
          <button
            onClick={handleMassDelete}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition"
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
          <div className="hidden md:block bg-zinc-900 border border-red-900/20 rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-900/20 bg-zinc-800">
                  <th className="text-left p-4">
                    <input
                      type="checkbox"
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

                  return (
                    <tr key={product.id} className="border-b border-red-900/20 hover:bg-zinc-800">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelection(product.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="text-white font-semibold">{product.brand}</div>
                          <div className="text-gray-400 text-sm">{product.name}</div>
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
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/inventory/${product.id}/edit`}
                            className="text-gray-400 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(product.id)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
            {products.map((product) => (
              <div key={product.id} className="bg-zinc-900 border border-red-900/20 rounded p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{product.brand}</h3>
                    <p className="text-gray-400 text-sm">{product.name}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(product.id)}
                    onChange={() => toggleSelection(product.id)}
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-gray-400 text-sm capitalize">{product.category}</span>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/inventory/${product.id}/edit`}
                      className="text-gray-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDuplicate(product.id)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}