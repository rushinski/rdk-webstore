"use client";

import { useEffect, useMemo, useState } from "react";

import { logError } from "@/lib/utils/log";

type LightspeedSettingsResponse = {
  settings?: {
    syncEnabled?: boolean;
    domainPrefix?: string | null;
  };
  error?: string;
};

type LightspeedImportResponse = {
  result?: {
    status?: string;
    scanned?: number;
    applied?: number;
    skipped?: number;
  };
  error?: string;
};

function getConnectionStatusLabel(input: { syncEnabled: boolean; domainPrefix: string }) {
  if (!input.syncEnabled) {
    return "Sync disabled";
  }

  if (!input.domainPrefix) {
    return "Configuration incomplete";
  }

  return "Ready for private token connection";
}

export function LightspeedSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [domainPrefix, setDomainPrefix] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/lightspeed/settings", {
          cache: "no-store",
        });
        const data = (await response
          .json()
          .catch(() => ({}))) as LightspeedSettingsResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load Lightspeed settings.");
        }

        if (data.settings) {
          setSyncEnabled(Boolean(data.settings.syncEnabled));
          setDomainPrefix(data.settings.domainPrefix ?? "");
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_lightspeed_settings_load" });
        setMessage(
          error instanceof Error ? error.message : "Failed to load Lightspeed settings.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const connectionStatus = useMemo(
    () => getConnectionStatusLabel({ syncEnabled, domainPrefix }),
    [domainPrefix, syncEnabled],
  );

  const save = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/lightspeed/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syncEnabled,
          domainPrefix: domainPrefix.trim() || null,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as LightspeedSettingsResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save Lightspeed settings.");
      }

      setSyncEnabled(Boolean(data.settings?.syncEnabled));
      setDomainPrefix(data.settings?.domainPrefix ?? "");
      setMessage("Lightspeed settings updated.");
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_lightspeed_settings_save" });
      setMessage(
        error instanceof Error ? error.message : "Failed to save Lightspeed settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const runImport = async () => {
    setIsImporting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/lightspeed/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await response.json().catch(() => ({}))) as LightspeedImportResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to import Lightspeed products.");
      }

      const summary = data.result ?? {};
      setMessage(
        `Import complete. Scanned ${summary.scanned ?? 0}, applied ${summary.applied ?? 0}, skipped ${summary.skipped ?? 0}.`,
      );
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_lightspeed_import" });
      setMessage(
        error instanceof Error ? error.message : "Failed to import Lightspeed products.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-zinc-400">Loading Lightspeed settings...</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <section className="space-y-4 rounded border border-zinc-800/70 bg-zinc-900 p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Connection</h2>
          <p className="text-sm text-zinc-400">
            Configure the Lightspeed store domain prefix used with your private
            application token.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-white">
          <input
            type="checkbox"
            checked={syncEnabled}
            onChange={(event) => setSyncEnabled(event.target.checked)}
            className="rdk-checkbox"
          />
          Enable Lightspeed sync
        </label>

        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
              Domain Prefix
            </label>
            <input
              type="text"
              value={domainPrefix}
              onChange={(event) => setDomainPrefix(event.target.value)}
              className="w-full border border-zinc-800/70 bg-zinc-950 px-3 py-2 text-white"
              placeholder="your-store-prefix"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Example: if your Lightspeed URL is `
              https://your-store-prefix.retail.lightspeed.app ` then the domain prefix is
              `your-store-prefix`.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-zinc-400">{message}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void runImport();
              }}
              disabled={isImporting || !syncEnabled || !domainPrefix.trim()}
              className="rounded border border-zinc-800/70 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-900 disabled:text-zinc-500"
            >
              {isImporting ? "Importing..." : "Run import"}
            </button>
            <button
              type="button"
              onClick={() => {
                void save();
              }}
              disabled={isSaving}
              className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-700"
            >
              {isSaving ? "Saving..." : "Save Lightspeed settings"}
            </button>
          </div>
        </div>
      </section>

      <aside className="space-y-4 rounded border border-zinc-800/70 bg-zinc-900 p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Status</h2>
          <p className="text-sm text-zinc-400">
            This confirms whether the sync foundation is configured enough for the next
            integration steps.
          </p>
        </div>

        <div className="rounded border border-zinc-800/70 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-red-400">
            Connection State
          </p>
          <p className="mt-2 text-base font-semibold text-white">{connectionStatus}</p>
          <p className="mt-2 text-sm text-zinc-400">
            Private token authentication is read from server env. This setting only stores
            the Lightspeed store prefix used to target the correct API host.
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Use manual import on staging to pull Lightspeed products if webhook delivery
            is not yet configured or product creation events are delayed.
          </p>
        </div>
      </aside>
    </div>
  );
}
