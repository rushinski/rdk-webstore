"use client";

import { RefreshCcw, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ModalPortal } from "@/components/ui/ModalPortal";

type PreviewGroups = {
  added: Array<{
    itemId?: string;
    entityKey: string;
    action: string;
    payload: Record<string, unknown>;
  }>;
  modified: Array<{
    itemId?: string;
    entityKey: string;
    action: string;
    payload: Record<string, unknown>;
  }>;
  archived: Array<{
    itemId?: string;
    entityKey: string;
    action: string;
    payload: Record<string, unknown>;
  }>;
  conflicts: Array<{
    itemId?: string;
    entityKey: string;
    action: string;
    payload: Record<string, unknown>;
  }>;
  skipped: Array<{
    itemId?: string;
    entityKey: string;
    action: string;
    payload: Record<string, unknown>;
  }>;
};

type PreviewProductSnapshot = {
  title: string;
  imageUrl: string | null;
  condition: string;
  stock: number;
  priceCents: number | null;
  costCents: number | null;
  sku: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  description: string | null;
  shippingCostCents: number | null;
  tags: Array<{ label: string; groupKey: string }>;
  variants: Array<{
    sizeLabel: string;
    priceCents: number | null;
    costCents: number | null;
    stock: number;
    sku: string;
  }>;
  status: "active" | "archived";
};

type PreviewCardPayload = {
  preview?: {
    current?: PreviewProductSnapshot | null;
    proposed?: PreviewProductSnapshot | null;
  };
};

type PreviewResponse = {
  syncRunId: string;
  pagination: {
    page: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalProducts: number | null;
    totalPages: number | null;
    totalGroupedItems: number | null;
    totalChanges: number | null;
  };
  summary: {
    added: number;
    modified: number;
    archived: number;
    conflicts: number;
    skipped: number;
  };
  groups: PreviewGroups;
};

const GROUP_LABELS: Record<keyof PreviewGroups, string> = {
  added: "Added",
  modified: "Modified",
  archived: "Archived",
  conflicts: "Conflicts",
  skipped: "Skipped",
};

const CARD_STATUS_LABELS: Record<PreviewProductSnapshot["status"], string> = {
  active: "Active",
  archived: "Archived",
};

function formatPreviewPrice(priceCents: number | null) {
  if (priceCents === null) {
    return "N/A";
  }
  return `$${(priceCents / 100).toFixed(2)}`;
}

function getPrimaryVariantLabel(product: PreviewProductSnapshot) {
  if (product.variants.length <= 1) {
    return product.variants[0]?.sizeLabel ?? "One Size";
  }

  return `${product.variants.length} variants`;
}

function PreviewPagination({
  preview,
  isLoading,
  onPrevious,
  onNext,
}: {
  preview: PreviewResponse;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-800/70 bg-zinc-900/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-300">
        Page {preview.pagination.page} of {preview.pagination.totalPages ?? "—"} · Showing{" "}
        {preview.pagination.pageSize} Lightspeed products per page
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isLoading || !preview.pagination.hasPreviousPage}
          className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous Page
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLoading || !preview.pagination.hasNextPage}
          className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next Page
        </button>
      </div>
    </div>
  );
}

function getPreviewColumns(
  action: string,
  payload: Record<string, unknown>,
): {
  leftLabel: string;
  rightLabel: string;
  leftCard: PreviewProductSnapshot | null;
  rightCard: PreviewProductSnapshot | null;
} | null {
  const preview = (payload as PreviewCardPayload).preview;
  if (!preview) {
    return null;
  }

  if (action === "create_website_product") {
    return {
      leftLabel: "Lightspeed",
      rightLabel: "Website After Sync",
      leftCard: preview.proposed ?? null,
      rightCard: null,
    };
  }

  if (action === "create_lightspeed_product") {
    return {
      leftLabel: "Website",
      rightLabel: "Lightspeed After Sync",
      leftCard: preview.current ?? null,
      rightCard: null,
    };
  }

  if (action === "archive_website_product" || action === "archive_lightspeed_product") {
    return {
      leftLabel: "Current",
      rightLabel: "After Sync",
      leftCard: preview.current ?? null,
      rightCard: preview.current
        ? {
            ...preview.current,
            status: "archived",
          }
        : null,
    };
  }

  return {
    leftLabel: "Current",
    rightLabel: "After Sync",
    leftCard: preview.current ?? null,
    rightCard: preview.proposed ?? null,
  };
}

function PreviewProductCard({
  product,
  placeholderLabel,
}: {
  product: PreviewProductSnapshot | null;
  placeholderLabel?: string;
}) {
  if (!product) {
    return (
      <div className="flex h-full min-h-[26rem] flex-col items-center justify-center rounded border border-dashed border-zinc-800 bg-zinc-950/60 p-6 text-center text-sm text-zinc-500">
        {placeholderLabel ?? "No item on this side"}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded border border-zinc-800/70 bg-zinc-900">
      <div className="relative aspect-square bg-zinc-950">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
            No image
          </div>
        )}

        <div className="absolute right-2 top-2 flex gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              product.condition === "new"
                ? "bg-emerald-600 text-white"
                : "bg-amber-400 text-black"
            }`}
          >
            {product.condition === "new" ? "NEW" : "PRE-OWNED"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              product.status === "active"
                ? "bg-zinc-950/80 text-zinc-200"
                : "bg-red-900/90 text-red-100"
            }`}
          >
            {CARD_STATUS_LABELS[product.status]}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="line-clamp-2 text-sm font-bold text-white">{product.title}</p>
          <p className="mt-1 text-xs text-zinc-400">{getPrimaryVariantLabel(product)}</p>
          {product.model ? (
            <p className="mt-1 text-xs text-zinc-500">Model: {product.model}</p>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-zinc-300">
          <div>
            <dt className="text-zinc-500">Price</dt>
            <dd className="mt-0.5 font-semibold text-white">
              {formatPreviewPrice(product.priceCents)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Cost</dt>
            <dd className="mt-0.5 font-semibold text-white">
              {formatPreviewPrice(product.costCents)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Stock</dt>
            <dd className="mt-0.5 font-semibold text-white">{product.stock}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Shipping</dt>
            <dd className="mt-0.5 font-semibold text-white">
              {formatPreviewPrice(product.shippingCostCents)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Brand</dt>
            <dd className="mt-0.5">{product.brand ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Category</dt>
            <dd className="mt-0.5 capitalize">{product.category ?? "Unknown"}</dd>
          </div>
        </dl>

        <div className="mt-auto space-y-2 border-t border-zinc-800/70 pt-3 text-xs text-zinc-400">
          <p className="font-mono text-[11px] text-zinc-300">{product.sku}</p>
          {product.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <span
                  key={`${tag.groupKey}:${tag.label}`}
                  className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-0.5 text-[10px] text-zinc-300"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          ) : null}
          {product.description ? (
            <p className="line-clamp-3 whitespace-pre-wrap">{product.description}</p>
          ) : (
            <p className="text-zinc-600">No description</p>
          )}
        </div>

        {product.variants.length > 1 ? (
          <div className="rounded border border-zinc-800/70 bg-zinc-950/60 p-3">
            <div className="grid grid-cols-4 gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
              <span>Size</span>
              <span>Price</span>
              <span>Cost</span>
              <span>Stock</span>
            </div>
            <div className="mt-2 space-y-2">
              {product.variants.map((variant) => (
                <div
                  key={variant.sku}
                  className="grid grid-cols-4 gap-2 text-xs text-zinc-300"
                >
                  <span>{variant.sizeLabel}</span>
                  <span>{formatPreviewPrice(variant.priceCents)}</span>
                  <span>{formatPreviewPrice(variant.costCents)}</span>
                  <span>{variant.stock}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LightspeedSyncPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceOfTruth, setSourceOfTruth] = useState<
    | "lightspeed_inventory"
    | "website_inventory"
    | "lightspeed_full_override"
    | "website_full_override"
  >("lightspeed_inventory");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const runPreview = async (targetPage = page) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/lightspeed/sync/preview", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ sourceOfTruth, page: targetPage, pageSize: 50 }),
      });
      const data = (await response.json()) as {
        preview?: PreviewResponse;
        error?: string;
      };

      if (!response.ok || !data.preview) {
        setError(data.error ?? "Failed to build sync preview.");
        return;
      }

      setPreview(data.preview);
      setPage(data.preview.pagination.page);
      setDecisions({});
      setApplyMessage(null);
    } catch {
      setError("Failed to build sync preview.");
    } finally {
      setIsLoading(false);
    }
  };

  const setDecisionForAll = (approved: boolean) => {
    if (!preview) {
      return;
    }

    const next: Record<string, boolean> = {};
    for (const group of Object.values(preview.groups)) {
      for (const item of group) {
        if (item.itemId) {
          next[item.itemId] = approved;
        }
      }
    }

    setDecisions(next);
  };

  const applyPreview = async (mode: "accept_all" | "deny_all" | "selective") => {
    if (!preview) {
      return;
    }

    setIsApplying(true);
    setError(null);
    setApplyMessage(null);

    try {
      const response = await fetch("/api/admin/lightspeed/sync/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          syncRunId: preview.syncRunId,
          mode,
          decisions:
            mode === "selective"
              ? Object.entries(decisions).map(([itemId, approved]) => ({
                  itemId,
                  approved,
                }))
              : undefined,
        }),
      });
      const data = (await response.json()) as {
        result?: {
          summary: {
            applied: number;
            rejected: number;
            failed: number;
          };
        };
        error?: string;
      };

      if (!response.ok || !data.result) {
        setError(data.error ?? "Failed to apply sync changes.");
        return;
      }

      setApplyMessage(
        `Applied ${data.result.summary.applied}, rejected ${data.result.summary.rejected}, failed ${data.result.summary.failed}.`,
      );
    } catch {
      setError("Failed to apply sync changes.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 rounded border border-zinc-800/70 bg-zinc-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 sm:gap-2 sm:px-4 sm:text-base"
      >
        <RefreshCcw className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="hidden sm:inline">Sync Inventory</span>
      </button>

      <ModalPortal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        zIndexClassName="z-[10000]"
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
          className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-950"
        >
          <div className="border-b border-zinc-800 px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 pr-4">
                <h2 className="text-xl font-bold text-white">Lightspeed Sync Preview</h2>
                <p className="max-w-4xl text-sm leading-7 text-zinc-400">
                  Build a dry-run reconciliation grouped by change type before applying
                  any inventory sync changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
                aria-label="Close sync preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {preview ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded border border-zinc-800/70 bg-zinc-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Total Lightspeed Products
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {preview.pagination.totalProducts ?? "—"}
                  </p>
                </div>
                <div className="rounded border border-zinc-800/70 bg-zinc-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Total Proposed Changes
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {preview.pagination.totalChanges ?? "—"}
                  </p>
                </div>
                <div className="rounded border border-zinc-800/70 bg-zinc-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Total Review Items
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {preview.pagination.totalGroupedItems ?? "—"}
                  </p>
                </div>
                <div className="rounded border border-zinc-800/70 bg-zinc-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Current Page
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {preview.pagination.page}
                  </p>
                </div>
                <div className="rounded border border-zinc-800/70 bg-zinc-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Total Pages
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {preview.pagination.totalPages ?? "—"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="max-w-4xl text-sm leading-7 text-zinc-400">
                  Choose which side owns inventory values for this preview, then build the
                  proposed change set. Full override modes make the selected side own
                  existence and metadata too, while still translating into the destination
                  format.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex min-w-[250px] flex-col gap-2 text-sm text-zinc-300">
                  <span>Inventory source of truth</span>
                  <select
                    value={sourceOfTruth}
                    onChange={(event) => {
                      setSourceOfTruth(
                        event.target.value as
                          | "lightspeed_inventory"
                          | "website_inventory"
                          | "lightspeed_full_override"
                          | "website_full_override",
                      );
                      setPage(1);
                      setPreview(null);
                      setDecisions({});
                      setApplyMessage(null);
                      setError(null);
                    }}
                    className="rounded border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-white outline-none"
                  >
                    <option value="lightspeed_inventory">Lightspeed</option>
                    <option value="website_inventory">Website</option>
                    <option value="lightspeed_full_override">
                      Lightspeed Full Override
                    </option>
                    <option value="website_full_override">Website Full Override</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => void runPreview(1)}
                  disabled={isLoading}
                  className="rounded bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Building Preview..." : "Preview Sync"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {applyMessage && (
              <div className="mt-5 rounded border border-emerald-900/70 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                {applyMessage}
              </div>
            )}

            {preview && (
              <div className="mt-6 space-y-6">
                <PreviewPagination
                  preview={preview}
                  isLoading={isLoading}
                  onPrevious={() => void runPreview(page - 1)}
                  onNext={() => void runPreview(page + 1)}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDecisionForAll(true);
                      void applyPreview("accept_all");
                    }}
                    disabled={isApplying}
                    className="rounded bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Accept All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDecisionForAll(false);
                      void applyPreview("deny_all");
                    }}
                    disabled={isApplying}
                    className="rounded bg-zinc-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Deny All
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyPreview("selective")}
                    disabled={isApplying}
                    className="rounded bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Apply Selected Decisions
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {(
                    Object.keys(preview.summary) as Array<
                      keyof PreviewResponse["summary"]
                    >
                  ).map((key) => (
                    <div
                      key={key}
                      className="rounded border border-zinc-800/70 bg-zinc-900/60 px-5 py-4"
                    >
                      <p className="text-xs uppercase tracking-wide text-zinc-500">
                        {GROUP_LABELS[key]}
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-white">
                        {preview.summary[key]}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-5">
                  {(Object.keys(preview.groups) as Array<keyof PreviewGroups>).map(
                    (key) => {
                      const items = preview.groups[key];
                      if (items.length === 0) {
                        return null;
                      }

                      return (
                        <div
                          key={key}
                          className="rounded border border-zinc-800/70 bg-zinc-900/30"
                        >
                          <div className="border-b border-zinc-800/70 px-5 py-4">
                            <h3 className="text-base font-semibold text-white">
                              {GROUP_LABELS[key]}
                            </h3>
                          </div>
                          <div className="divide-y divide-zinc-800/70">
                            {items.map((item) => (
                              <div key={`${key}-${item.entityKey}`} className="px-5 py-5">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex items-center gap-3">
                                    {item.itemId ? (
                                      <input
                                        type="checkbox"
                                        checked={decisions[item.itemId] ?? false}
                                        onChange={(event) =>
                                          setDecisions((current) => ({
                                            ...current,
                                            [item.itemId as string]: event.target.checked,
                                          }))
                                        }
                                        className="rdk-checkbox"
                                      />
                                    ) : null}
                                    <p className="text-base font-medium text-white">
                                      {item.entityKey}
                                    </p>
                                  </div>
                                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                                    {item.action.replaceAll("_", " ")}
                                  </p>
                                </div>
                                {(() => {
                                  const columns = getPreviewColumns(
                                    item.action,
                                    item.payload,
                                  );

                                  if (!columns) {
                                    return (
                                      <div className="mt-4 rounded border border-zinc-800/70 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-400">
                                        No visual preview is available for this item yet.
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="mt-4 grid gap-5 xl:grid-cols-2">
                                      <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                                          {columns.leftLabel}
                                        </p>
                                        <PreviewProductCard
                                          product={columns.leftCard}
                                          placeholderLabel="No item exists here yet"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                                          {columns.rightLabel}
                                        </p>
                                        <PreviewProductCard
                                          product={columns.rightCard}
                                          placeholderLabel="No item exists here yet"
                                        />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                <PreviewPagination
                  preview={preview}
                  isLoading={isLoading}
                  onPrevious={() => void runPreview(page - 1)}
                  onNext={() => void runPreview(page + 1)}
                />
              </div>
            )}
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
