"use client";

import { useState } from "react";

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

type PreviewResponse = {
  syncRunId: string;
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

export function LightspeedSyncPanel() {
  const [sourceOfTruth, setSourceOfTruth] = useState<
    "lightspeed_inventory" | "website_inventory"
  >("lightspeed_inventory");
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  const runPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/lightspeed/sync/preview", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ sourceOfTruth }),
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
    <section className="rounded border border-zinc-800/70 bg-zinc-950/70 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Lightspeed Sync Preview</h2>
          <p className="max-w-3xl text-sm text-zinc-400">
            Build a dry-run reconciliation grouped by change type before applying any
            inventory sync changes.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span>Inventory source of truth</span>
            <select
              value={sourceOfTruth}
              onChange={(event) =>
                setSourceOfTruth(
                  event.target.value as "lightspeed_inventory" | "website_inventory",
                )
              }
              className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="lightspeed_inventory">Lightspeed</option>
              <option value="website_inventory">Website</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => void runPreview()}
            disabled={isLoading}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Building Preview..." : "Preview Sync"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded border border-red-900/70 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {applyMessage && (
        <div className="mt-4 rounded border border-emerald-900/70 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {applyMessage}
        </div>
      )}

      {preview && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDecisionForAll(true);
                void applyPreview("accept_all");
              }}
              disabled={isApplying}
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="rounded bg-zinc-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Deny All
            </button>
            <button
              type="button"
              onClick={() => void applyPreview("selective")}
              disabled={isApplying}
              className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply Selected Decisions
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {(
              Object.keys(preview.summary) as Array<keyof PreviewResponse["summary"]>
            ).map((key) => (
              <div
                key={key}
                className="rounded border border-zinc-800/70 bg-zinc-900/60 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {GROUP_LABELS[key]}
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {preview.summary[key]}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {(Object.keys(preview.groups) as Array<keyof PreviewGroups>).map((key) => {
              const items = preview.groups[key];
              if (items.length === 0) {
                return null;
              }

              return (
                <div
                  key={key}
                  className="rounded border border-zinc-800/70 bg-zinc-900/30"
                >
                  <div className="border-b border-zinc-800/70 px-4 py-3">
                    <h3 className="text-sm font-semibold text-white">
                      {GROUP_LABELS[key]}
                    </h3>
                  </div>
                  <div className="divide-y divide-zinc-800/70">
                    {items.map((item) => (
                      <div key={`${key}-${item.entityKey}`} className="px-4 py-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
                            <p className="text-sm font-medium text-white">
                              {item.entityKey}
                            </p>
                          </div>
                          <p className="text-xs uppercase tracking-wide text-zinc-500">
                            {item.action.replaceAll("_", " ")}
                          </p>
                        </div>
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-400">
                          {JSON.stringify(item.payload, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
