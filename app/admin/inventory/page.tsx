// app/admin/inventory/page.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Copy, Upload, X } from 'lucide-react';
import type { ProductWithDetails } from "@/types/views/product";
import type { Category, Condition } from "@/types/views/product";
import { logError } from '@/lib/log';

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCategory, setImportCategory] = useState<Category>('sneakers');
  const [importCondition, setImportCondition] = useState<Condition>('new');
  const [importStatus, setImportStatus] = useState<{
    rowsParsed: number;
    rowsUpserted: number;
    rowsFailed: number;
    componentRowsParsed: number;
    errors: string[];
    alreadyImported?: boolean;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importDryRun, setImportDryRun] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const importFileRef = useRef<HTMLInputElement | null>(null);

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
      logError(error, { layer: "frontend", event: "admin_load_inventory_products" });
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

  const openImportModal = () => setIsImportModalOpen(true);
  const closeImportModal = () => setIsImportModalOpen(false);

  const handleSquareImport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!importFile) {
      setImportError('Please select an Excel .xlsx file.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('defaultCategory', importCategory);
      formData.append('condition', importCondition);
      formData.append('dryRun', String(importDryRun));

      const response = await fetch('/api/admin/inventory/import/rdk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to import inventory.');
      }

      const parsedErrors = Array.isArray(data?.errors)
        ? data.errors.map((error: any) => `${error.sheet} row ${error.rowNumber}: ${error.message}`)
        : [];

      setImportStatus({
        rowsParsed: data.rowsParsed ?? 0,
        rowsUpserted: data.rowsUpserted ?? 0,
        rowsFailed: data.rowsFailed ?? 0,
        componentRowsParsed: data.componentRowsParsed ?? 0,
        errors: parsedErrors,
        alreadyImported: data.alreadyImported ?? false,
      });
      setImportFile(null);
      if (importFileRef.current) {
        importFileRef.current.value = '';
      }
      if (!importDryRun && !data?.alreadyImported) {
        await loadProducts();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import inventory.';
      setImportError(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Inventory</h1>
          <p className="text-gray-400">{products.length} products</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openImportModal}
            className="flex items-center gap-2 border border-zinc-800/70 text-gray-200 hover:text-white hover:border-zinc-600 px-4 py-2 text-sm font-semibold transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload Inventory
          </button>
          <Link
            href="/admin/inventory/create"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Create Product
          </Link>
        </div>
      </div>

      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closeImportModal}
        >
          <div
            className="w-full max-w-3xl bg-zinc-900 border border-zinc-800/70 p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Upload inventory"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Upload Inventory</h2>
                <p className="text-gray-500 text-sm">
                  Import the Real Deal Kickz Excel export (.xlsx) with Items and Component Inventory sheets.
                </p>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                className="text-gray-400 hover:text-white transition cursor-pointer"
                aria-label="Close upload modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSquareImport} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-3">
                <label className="block text-gray-400 text-sm mb-1">Excel file</label>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                  className="w-full bg-zinc-800 text-white px-3 py-2 border border-zinc-800/70 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Default Category</label>
                <select
                  value={importCategory}
                  onChange={(event) => setImportCategory(event.target.value as Category)}
                  className="w-full bg-zinc-800 text-white px-3 py-2 border border-zinc-800/70"
                >
                  <option value="sneakers">Sneakers</option>
                  <option value="clothing">Clothing</option>
                  <option value="accessories">Accessories</option>
                  <option value="electronics">Electronics</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Condition</label>
                <select
                  value={importCondition}
                  onChange={(event) => setImportCondition(event.target.value as Condition)}
                  className="w-full bg-zinc-800 text-white px-3 py-2 border border-zinc-800/70"
                >
                  <option value="new">New</option>
                  <option value="used">Used</option>
                </select>
              </div>
              <label className="md:col-span-4 flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importDryRun}
                  onChange={(event) => setImportDryRun(event.target.checked)}
                  className="rdk-checkbox"
                />
                Dry run (no changes will be saved)
              </label>
              <div className="md:col-span-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full md:w-auto bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-semibold px-4 py-2 transition cursor-pointer"
                >
                  {isImporting ? 'Importing...' : 'Import Inventory'}
                </button>
              </div>
            </form>

            {importError && (
              <div className="text-sm text-red-400">{importError}</div>
            )}

            {importStatus && (
              <div className="text-sm text-gray-300 space-y-1">
                <div>
                  {importStatus.alreadyImported
                    ? 'This file was already imported.'
                    : `Upserted ${importStatus.rowsUpserted} rows from ${importStatus.rowsParsed} Items rows.`}
                </div>
                {importStatus.rowsFailed > 0 && (
                  <div>{importStatus.rowsFailed} rows failed.</div>
                )}
                {importStatus.componentRowsParsed > 0 && (
                  <div>{importStatus.componentRowsParsed} Component Inventory rows parsed.</div>
                )}
                {importStatus.errors?.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {importStatus.errors.slice(0, 3).join(' ')}
                    {importStatus.errors.length > 3 ? ' ...' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 flex items-center justify-between">
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
          <div className="hidden md:block bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden">
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
              <div key={product.id} className="bg-zinc-900 border border-zinc-800/70 rounded p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">
                      {product.title_display ?? `${product.brand} ${product.name}`.trim()}
                    </h3>
                  </div>
                  <input
                    type="checkbox"
                    className="rdk-checkbox"
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
