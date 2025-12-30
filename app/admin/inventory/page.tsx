// app/admin/inventory/page.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Upload, X, MoreVertical, Search } from 'lucide-react';
import type { ProductWithDetails } from "@/types/views/product";
import type { Category, Condition } from "@/types/views/product";
import { logError } from '@/lib/log';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<Condition | 'all'>('all');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{
    rowsParsed: number;
    rowsUpserted: number;
    rowsFailed: number;
    componentRowsParsed: number;
    errors: string[];
    alreadyImported?: boolean;
    status?: string;
  } | null>(null);
  const [importProgress, setImportProgress] = useState<{
    id: string;
    status: string | null;
    rowsParsed: number;
    rowsUpserted: number;
    rowsFailed: number;
  } | null>(null);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [pendingMassDelete, setPendingMassDelete] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null);
  const [resolution, setResolution] = useState<{
    missingCategoryRows: number[];
    missingConditionRows: number[];
  } | null>(null);
  const [overrideCategory, setOverrideCategory] = useState<Category | ''>('');
  const [overrideCondition, setOverrideCondition] = useState<Condition | ''>('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadProducts({
        q: searchQuery,
        category: categoryFilter,
        condition: conditionFilter,
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, categoryFilter, conditionFilter]);

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
    if (!activeImportId) return;
    let isActive = true;

    const pollImport = async () => {
      try {
        const response = await fetch(`/api/admin/inventory/imports/${activeImportId}`);
        const data = await response.json();
        if (!response.ok || !isActive) return;

        const status = data.status ?? null;
        const rowsParsed = data.rows_parsed ?? 0;
        const rowsUpserted = data.rows_upserted ?? 0;
        const rowsFailed = data.rows_failed ?? 0;

        if (status === 'processing') {
          setImportProgress({
            id: data.id,
            status,
            rowsParsed,
            rowsUpserted,
            rowsFailed,
          });
          return;
        }

        setImportProgress(null);
        setActiveImportId(null);
        setImportStatus({
          rowsParsed,
          rowsUpserted,
          rowsFailed,
          componentRowsParsed: 0,
          errors: [],
          status,
        });

        if (status === 'completed') {
          await loadProducts({
            q: searchQuery,
            category: categoryFilter,
            condition: conditionFilter,
          });
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_import_poll" });
      }
    };

    pollImport();
    const interval = setInterval(pollImport, 2000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [activeImportId, searchQuery, categoryFilter, conditionFilter]);

  const loadProducts = async (filters?: {
    q?: string;
    category?: Category | 'all';
    condition?: Condition | 'all';
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

  const extractResolutionIssues = (issues: Array<{ rowNumber?: number; message?: string }>) => {
    const missingCategoryRows: number[] = [];
    const missingConditionRows: number[] = [];

    issues.forEach((issue) => {
      const message = issue.message?.toLowerCase() ?? '';
      const rowNumber = issue.rowNumber;
      if (!rowNumber) return;
      if (message.includes('missing category')) {
        missingCategoryRows.push(rowNumber);
      }
      if (message.includes('missing condition')) {
        missingConditionRows.push(rowNumber);
      }
    });

    if (missingCategoryRows.length === 0 && missingConditionRows.length === 0) return null;

    return {
      missingCategoryRows,
      missingConditionRows,
    };
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

  const openImportModal = () => setIsImportModalOpen(true);
  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setResolution(null);
    setOverrideCategory('');
    setOverrideCondition('');
    setImportError(null);
    setImportFile(null);
    if (importFileRef.current) {
      importFileRef.current.value = '';
    }
  };

  const handleSquareImport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!importFile) {
      setImportError('Please select an Excel .xlsx file.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportStatus(null);
    setImportProgress(null);
    setActiveImportId(null);
    setResolution(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      if (overrideCategory) formData.append('overrideCategory', overrideCategory);
      if (overrideCondition) formData.append('overrideCondition', overrideCondition);

      const response = await fetch('/api/admin/inventory/import/rdk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        const issues = Array.isArray(data?.issues) ? data.issues : [];
        const resolutionIssues = extractResolutionIssues(issues);
        if (resolutionIssues) {
          setResolution(resolutionIssues);
          setImportError(null);
          return;
        }
        throw new Error(data?.error || 'Failed to import inventory.');
      }

      if (response.status === 202 && data?.importId) {
        setActiveImportId(data.importId);
        setImportProgress({
          id: data.importId,
          status: data.status ?? 'processing',
          rowsParsed: 0,
          rowsUpserted: 0,
          rowsFailed: 0,
        });
        setImportStatus(null);
      } else {
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
          status: data.status ?? 'completed',
        });
      }
      setImportFile(null);
      setOverrideCategory('');
      setOverrideCondition('');
      if (importFileRef.current) {
        importFileRef.current.value = '';
      }
      if (!data?.alreadyImported && response.status !== 202) {
        await loadProducts({
          q: searchQuery,
          category: categoryFilter,
          condition: conditionFilter,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import inventory.';
      setImportError(message);
    } finally {
      setIsImporting(false);
    }
  };

  const progressTotal = importProgress?.rowsParsed ?? 0;
  const progressDone = (importProgress?.rowsUpserted ?? 0) + (importProgress?.rowsFailed ?? 0);
  const progressPercent =
    progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;
  const requiresCategoryOverride = (resolution?.missingCategoryRows.length ?? 0) > 0;
  const requiresConditionOverride = (resolution?.missingConditionRows.length ?? 0) > 0;
  const resolutionReady =
    (!requiresCategoryOverride || Boolean(overrideCategory)) &&
    (!requiresConditionOverride || Boolean(overrideCondition));
  const importButtonLabel = resolution ? 'Continue Import' : 'Import Inventory';

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

      {importProgress && (
        <div className="bg-zinc-900 border border-zinc-800/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-white font-semibold">Inventory import in progress</div>
              <div className="text-xs text-gray-500">Import ID: {importProgress.id.slice(0, 8)}</div>
            </div>
            <div className="text-xs text-gray-400">
              {progressTotal > 0 ? `${progressDone} / ${progressTotal} rows` : 'Preparing rows...'}
            </div>
          </div>
          <div className="h-2 bg-zinc-800">
            <div
              className="h-full bg-red-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {importStatus && !importProgress && (
        <div className="bg-zinc-900 border border-zinc-800/70 p-4 text-sm text-gray-300 space-y-1">
          {importStatus.status === 'failed' ? (
            <div className="text-red-400">Inventory import failed.</div>
          ) : (
            <div>
              {importStatus.alreadyImported
                ? 'This file was already imported.'
                : `Upserted ${importStatus.rowsUpserted} rows from ${importStatus.rowsParsed} Items rows.`}
            </div>
          )}
          {importStatus.rowsFailed > 0 && <div>{importStatus.rowsFailed} rows failed.</div>}
        </div>
      )}

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
                <p className="text-gray-600 text-xs mt-2">
                  You can close this window while the import runs. Progress continues in the background.
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
              <div className="md:col-span-4">
                <label className="block text-gray-400 text-sm mb-2">Excel file</label>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    setImportFile(nextFile);
                    setResolution(null);
                    setOverrideCategory('');
                    setOverrideCondition('');
                  }}
                  className="sr-only"
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => importFileRef.current?.click()}
                    className="inline-flex items-center justify-center bg-zinc-800 text-white px-4 py-2 border border-zinc-700 hover:border-zinc-500 transition cursor-pointer"
                  >
                    Choose file
                  </button>
                  <div className="text-xs text-gray-500 truncate">
                    {importFile ? importFile.name : 'No file selected'}
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isImporting || (resolution && !resolutionReady)}
                  className="w-full md:w-auto bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-semibold px-4 py-2 transition cursor-pointer"
                >
                  {isImporting ? 'Importing...' : importButtonLabel}
                </button>
              </div>
            </form>

            {resolution && (
              <div className="bg-zinc-950/60 border border-zinc-800/70 p-4 space-y-3 text-sm text-gray-300">
                <div className="text-white font-semibold">Manual category/condition required</div>
                <div className="text-xs text-gray-500">
                  We could not determine required fields for some rows. Choose values to apply and continue.
                </div>
                {requiresCategoryOverride && (
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Category override</label>
                    <select
                      value={overrideCategory}
                      onChange={(event) => setOverrideCategory(event.target.value as Category)}
                      className="w-full bg-zinc-800 text-white px-3 py-2 border border-zinc-800/70 cursor-pointer"
                    >
                      <option value="">Select category</option>
                      <option value="sneakers">Sneakers</option>
                      <option value="clothing">Clothing</option>
                      <option value="accessories">Accessories</option>
                      <option value="electronics">Electronics</option>
                    </select>
                    <div className="mt-1 text-xs text-gray-500">
                      Missing on rows: {resolution.missingCategoryRows.slice(0, 6).join(', ')}
                      {resolution.missingCategoryRows.length > 6 ? ' ...' : ''}
                    </div>
                  </div>
                )}
                {requiresConditionOverride && (
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Condition override</label>
                    <select
                      value={overrideCondition}
                      onChange={(event) => setOverrideCondition(event.target.value as Condition)}
                      className="w-full bg-zinc-800 text-white px-3 py-2 border border-zinc-800/70 cursor-pointer"
                    >
                      <option value="">Select condition</option>
                      <option value="new">New</option>
                      <option value="used">Used</option>
                    </select>
                    <div className="mt-1 text-xs text-gray-500">
                      Missing on rows: {resolution.missingConditionRows.slice(0, 6).join(', ')}
                      {resolution.missingConditionRows.length > 6 ? ' ...' : ''}
                    </div>
                  </div>
                )}
                {!resolutionReady && (
                  <div className="text-xs text-gray-500">
                    Select the missing values to continue the import.
                  </div>
                )}
              </div>
            )}

            {importError && (
              <div className="text-sm text-red-400">{importError}</div>
            )}

            {importStatus && (
              <div className="text-sm text-gray-300 space-y-1">
                {importStatus.status === 'failed' ? (
                  <div className="text-red-400">Import failed. Please review the file and try again.</div>
                ) : (
                  <div>
                    {importStatus.alreadyImported
                      ? 'This file was already imported.'
                      : `Upserted ${importStatus.rowsUpserted} rows from ${importStatus.rowsParsed} Items rows.`}
                  </div>
                )}
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
