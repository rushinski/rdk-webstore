// src/components/admin/nexus/HomeOfficeSetupModal.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { X, Building, AlertTriangle } from "lucide-react";

import { STATE_NAMES } from "@/config/constants/nexus-thresholds";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { RdkSelect } from "@/components/ui/Select";

type HomeOfficeSetupModalProps = {
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  isConfigured?: boolean;
};

type ExistingAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type OldHomeOfficeAction = {
  hasPhysicalNexus: boolean;
  continueCollecting: boolean;
};

export default function HomeOfficeSetupModal({
  onClose,
  onSuccess,
  title,
  isConfigured = false,
}: HomeOfficeSetupModalProps) {
  const [formData, setFormData] = useState({
    stateCode: "",
    businessName: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
  });
  const [existingAddress, setExistingAddress] = useState<ExistingAddress | null>(null);
  const [oldHomeState, setOldHomeState] = useState<string | null>(null);
  const [showOldHomeAction, setShowOldHomeAction] = useState(false);
  const [oldHomeAction, setOldHomeAction] = useState<OldHomeOfficeAction>({
    hasPhysicalNexus: true,
    continueCollecting: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stateOptions = useMemo(
    () =>
      Object.entries(STATE_NAMES).map(([code, name]) => ({
        value: code,
        label: `${name} (${code})`,
      })),
    [],
  );

  useEffect(() => {
    if (isConfigured) {
      fetchExistingAddress();
    } else {
      setIsLoading(false);
    }
  }, [isConfigured]);

  const fetchExistingAddress = async () => {
    try {
      setIsLoading(true);
      const [addressRes, summaryRes] = await Promise.all([
        fetch("/api/admin/nexus/head-office-address"),
        fetch("/api/admin/nexus/summary"),
      ]);

      if (addressRes.ok) {
        const { address } = await addressRes.json();
        if (address) {
          setExistingAddress(address);
          setFormData({
            stateCode: address.state || "",
            businessName: "",
            line1: address.line1 || "",
            line2: address.line2 || "",
            city: address.city || "",
            postalCode: address.postal_code || "",
          });
        }
      }

      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        setOldHomeState(summary.homeState);
      }
    } catch (err) {
      console.error("Failed to fetch existing address:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !formData.stateCode ||
      !formData.line1 ||
      !formData.city ||
      !formData.postalCode
    ) {
      setError("Please fill in all required fields");
      return;
    }

    // If changing home office and state is different, show old home action dialog
    if (isConfigured && oldHomeState && formData.stateCode !== oldHomeState) {
      setShowOldHomeAction(true);
      return;
    }

    await submitHomeOffice();
  };

  const submitHomeOffice = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/admin/nexus/setup-home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateCode: formData.stateCode,
          businessName: formData.businessName || undefined,
          address: {
            line1: formData.line1,
            line2: formData.line2 || undefined,
            city: formData.city,
            state: formData.stateCode,
            postalCode: formData.postalCode,
            country: "US",
          },
          oldHomeState:
            isConfigured && oldHomeState !== formData.stateCode
              ? oldHomeState
              : undefined,
          oldHomeAction:
            isConfigured && oldHomeState !== formData.stateCode
              ? oldHomeAction
              : undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to setup home office");
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to setup home office");
      setShowOldHomeAction(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOldHomeActionSubmit = async () => {
    await submitHomeOffice();
  };

  if (isLoading) {
    return (
      <ModalPortal open={true} onClose={onClose}>
        <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800/70 rounded-sm shadow-xl p-8">
          <div className="text-center text-zinc-400">Loading...</div>
        </div>
      </ModalPortal>
    );
  }

  if (showOldHomeAction && oldHomeState) {
    return (
      <ModalPortal open={true} onClose={() => setShowOldHomeAction(false)}>
        <div
          className="w-full max-w-xl bg-zinc-950 border border-zinc-800/70 rounded-sm shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-800/70">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Update Previous Home Office
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  What should we do with {STATE_NAMES[oldHomeState]} ({oldHomeState})?
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOldHomeAction(false)}
              className="p-2 border border-zinc-800/70 hover:border-zinc-600 rounded-sm"
            >
              <X className="w-4 h-4 text-zinc-300" />
            </button>
          </div>

          <div className="px-6 py-6 space-y-6">
            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-sm">
              <p className="text-sm text-yellow-300 mb-2">
                You're moving your home office from{" "}
                <strong>{STATE_NAMES[oldHomeState]}</strong> to{" "}
                <strong>{STATE_NAMES[formData.stateCode]}</strong>. Please specify your
                ongoing relationship with the old state.
              </p>
              <p className="text-xs text-yellow-200/80 mt-2">
                <strong>Important:</strong> Most states require you to continue collecting
                sales tax through the end of the current tax year even after moving your
                office location. Consult with a tax professional before disabling
                collection.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-3 font-medium">
                  Do you still have physical nexus in {STATE_NAMES[oldHomeState]}?
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOldHomeAction({ ...oldHomeAction, hasPhysicalNexus: true })
                    }
                    className={[
                      "flex-1 px-4 py-3 rounded-sm text-sm border transition-colors",
                      oldHomeAction.hasPhysicalNexus
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-zinc-900 text-zinc-300 border-zinc-800/70 hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    Yes, I have physical presence
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOldHomeAction({ ...oldHomeAction, hasPhysicalNexus: false })
                    }
                    className={[
                      "flex-1 px-4 py-3 rounded-sm text-sm border transition-colors",
                      !oldHomeAction.hasPhysicalNexus
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-zinc-900 text-zinc-300 border-zinc-800/70 hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    No, only economic nexus
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-300 mb-3 font-medium">
                  Should we continue collecting tax in {STATE_NAMES[oldHomeState]}?
                </label>
                <p className="text-xs text-zinc-400 mb-3">
                  Most states require you to continue collecting through the end of the
                  current tax year. Only select "No" if you've confirmed with your state's
                  tax authority or a tax professional.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOldHomeAction({ ...oldHomeAction, continueCollecting: true })
                    }
                    className={[
                      "flex-1 px-4 py-3 rounded-sm text-sm border transition-colors",
                      oldHomeAction.continueCollecting
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-zinc-900 text-zinc-300 border-zinc-800/70 hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    Yes, keep collecting tax (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOldHomeAction({ ...oldHomeAction, continueCollecting: false })
                    }
                    className={[
                      "flex-1 px-4 py-3 rounded-sm text-sm border transition-colors",
                      !oldHomeAction.continueCollecting
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-zinc-900 text-zinc-300 border-zinc-800/70 hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    No, stop collecting tax
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-sm text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleOldHomeActionSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Updating..." : "Confirm Changes"}
              </button>
              <button
                type="button"
                onClick={() => setShowOldHomeAction(false)}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm border border-zinc-800/70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  }

  return (
    <ModalPortal open={true} onClose={onClose}>
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-zinc-800/70 rounded-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-800/70">
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-red-500" />
            <div>
              <h2 className="text-xl font-semibold text-white">
                {title ?? (isConfigured ? "Change Office Location" : "Setup Home Office")}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {isConfigured
                  ? "Update your business address for tax registrations"
                  : "Configure your business address to enable tax registrations"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 border border-zinc-800/70 hover:border-zinc-600 rounded-sm"
          >
            <X className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        <div className="px-6 py-6">
          {existingAddress && (
            <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800/70 rounded-sm">
              <div className="text-sm text-zinc-300 font-semibold mb-2">
                Current Address
              </div>
              <div className="text-sm text-zinc-400 space-y-1">
                <div>{existingAddress.line1}</div>
                {existingAddress.line2 && <div>{existingAddress.line2}</div>}
                <div>
                  {existingAddress.city}, {existingAddress.state}{" "}
                  {existingAddress.postal_code}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded-sm text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-2">
                Business Name (Optional)
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-zinc-950 text-white rounded-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="Your Business Name"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-300 mb-2">
                Home State <span className="text-red-500">*</span>
              </label>
              <RdkSelect
                value={formData.stateCode}
                onChange={(v) => setFormData({ ...formData, stateCode: v })}
                options={stateOptions}
                placeholder="Select…"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-300 mb-2">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.line1}
                onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-950 text-white rounded-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="123 Main Street"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-300 mb-2">Address Line 2</label>
              <input
                type="text"
                value={formData.line2}
                onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-950 text-white rounded-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="Suite 100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-950 text-white rounded-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Charleston"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-2">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-zinc-950 text-white rounded-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="29401"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Saving..."
                  : isConfigured
                    ? "Update Home Office"
                    : "Setup Home Office"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm border border-zinc-800/70"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800/70 rounded-sm">
            <p className="text-sm text-zinc-400">
              <strong className="text-zinc-200">Note:</strong> This address will be used
              as your tax registration headquarters with Stripe Tax.{" "}
              {!isConfigured && "It will mark your home state for physical nexus."}
            </p>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
