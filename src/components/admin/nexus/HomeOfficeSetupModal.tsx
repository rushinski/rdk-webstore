"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building, X } from "lucide-react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { RdkSelect } from "@/components/ui/Select";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { STATE_NAMES } from "@/config/constants/nexus-thresholds";

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
      void fetchExistingAddress();
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to setup home office";
      setError(message);
      setShowOldHomeAction(false);
    } finally {
      setIsSubmitting(false);
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

    if (isConfigured && oldHomeState && formData.stateCode !== oldHomeState) {
      setShowOldHomeAction(true);
      return;
    }

    await submitHomeOffice();
  };

  const shellClass = "w-full border border-brand-border bg-brand-surface shadow-xl";

  if (isLoading) {
    return (
      <ModalPortal open={true} onClose={onClose}>
        <div className={`${shellClass} max-w-2xl p-8`}>
          <div className="text-center text-brand-muted">Loading...</div>
        </div>
      </ModalPortal>
    );
  }

  if (showOldHomeAction && oldHomeState) {
    return (
      <ModalPortal open={true} onClose={() => setShowOldHomeAction(false)}>
        <div className={`${shellClass} max-w-xl`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between border-b border-brand-border px-6 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-700" />
              <div>
                <h2 className="text-xl font-semibold text-brand-text">
                  Update Previous Home Office
                </h2>
                <p className="mt-1 text-sm text-brand-muted">
                  What should we do with {STATE_NAMES[oldHomeState]} ({oldHomeState})?
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOldHomeAction(false)}
              className="border border-brand-border p-2 hover:bg-brand-page"
            >
              <X className="h-4 w-4 text-brand-muted" />
            </button>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm text-amber-800">
                You're moving your home office from{" "}
                <strong>{STATE_NAMES[oldHomeState]}</strong> to{" "}
                <strong>{STATE_NAMES[formData.stateCode]}</strong>. Please specify your
                ongoing relationship with the old state.
              </p>
              <p className="mt-2 text-xs text-amber-700">
                <strong>Important:</strong> Most states require you to continue collecting
                sales tax through the end of the current tax year even after moving your
                office location. Consult with a tax professional before disabling
                collection.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`${adminFormStyles.label} mb-3`}>
                  Do you still have physical nexus in {STATE_NAMES[oldHomeState]}?
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOldHomeAction({ ...oldHomeAction, hasPhysicalNexus: true })
                    }
                    className={[
                      "flex-1 border px-4 py-3 text-sm transition-colors",
                      oldHomeAction.hasPhysicalNexus
                        ? "border-brand-text bg-brand-text text-brand-page"
                        : "border-brand-border bg-brand-surface text-brand-text hover:bg-brand-page",
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
                      "flex-1 border px-4 py-3 text-sm transition-colors",
                      !oldHomeAction.hasPhysicalNexus
                        ? "border-brand-text bg-brand-text text-brand-page"
                        : "border-brand-border bg-brand-surface text-brand-text hover:bg-brand-page",
                    ].join(" ")}
                  >
                    No, only economic nexus
                  </button>
                </div>
              </div>

              <div>
                <label className={`${adminFormStyles.label} mb-3`}>
                  Should we continue collecting tax in {STATE_NAMES[oldHomeState]}?
                </label>
                <p className="mb-3 text-xs text-brand-muted">
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
                      "flex-1 border px-4 py-3 text-sm transition-colors",
                      oldHomeAction.continueCollecting
                        ? "border-brand-text bg-brand-text text-brand-page"
                        : "border-brand-border bg-brand-surface text-brand-text hover:bg-brand-page",
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
                      "flex-1 border px-4 py-3 text-sm transition-colors",
                      !oldHomeAction.continueCollecting
                        ? "border-brand-text bg-brand-text text-brand-page"
                        : "border-brand-border bg-brand-surface text-brand-text hover:bg-brand-page",
                    ].join(" ")}
                  >
                    No, stop collecting tax
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  void submitHomeOffice();
                }}
                disabled={isSubmitting}
                className={`${adminButtonStyles.primary} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isSubmitting ? "Updating..." : "Confirm Changes"}
              </button>
              <button
                type="button"
                onClick={() => setShowOldHomeAction(false)}
                className={adminButtonStyles.secondary}
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
        className={`${shellClass} max-h-[92vh] max-w-2xl overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-brand-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Building className="h-6 w-6 text-brand-text" />
            <div>
              <h2 className="text-xl font-semibold text-brand-text">
                {title ?? (isConfigured ? "Change Office Location" : "Setup Home Office")}
              </h2>
              <p className="mt-1 text-sm text-brand-muted">
                {isConfigured
                  ? "Update your business address for tax registrations"
                  : "Configure your business address to enable tax registrations"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="border border-brand-border p-2 hover:bg-brand-page"
          >
            <X className="h-4 w-4 text-brand-muted" />
          </button>
        </div>

        <div className="px-6 py-6">
          {existingAddress && (
            <div className="mb-6 border border-brand-border bg-brand-page p-4">
              <div className="mb-2 text-sm font-semibold text-brand-text">
                Current Address
              </div>
              <div className="space-y-1 text-sm text-brand-muted">
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
            <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            className="space-y-4"
          >
            <div>
              <label className={adminFormStyles.label}>Business Name (Optional)</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                className={adminFormStyles.input}
                placeholder="Your Business Name"
              />
            </div>

            <div>
              <label className={adminFormStyles.label}>
                Home State <span className="text-red-700">*</span>
              </label>
              <RdkSelect
                value={formData.stateCode}
                onChange={(value) => setFormData({ ...formData, stateCode: value })}
                options={stateOptions}
                placeholder="Select..."
              />
            </div>

            <div>
              <label className={adminFormStyles.label}>
                Address Line 1 <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={formData.line1}
                onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                className={adminFormStyles.input}
                placeholder="123 Main Street"
                required
              />
            </div>

            <div>
              <label className={adminFormStyles.label}>Address Line 2</label>
              <input
                type="text"
                value={formData.line2}
                onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                className={adminFormStyles.input}
                placeholder="Suite 100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={adminFormStyles.label}>
                  City <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={adminFormStyles.input}
                  placeholder="Charleston"
                  required
                />
              </div>
              <div>
                <label className={adminFormStyles.label}>
                  Postal Code <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                  className={adminFormStyles.input}
                  placeholder="29401"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${adminButtonStyles.primary} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
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
                className={adminButtonStyles.secondary}
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-6 border border-brand-border bg-brand-page p-4">
            <p className="text-sm text-brand-muted">
              <strong className="text-brand-text">Note:</strong> This address will be used
              as your tax registration headquarters.{" "}
              {!isConfigured && " It will mark your home state for physical nexus."}
            </p>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
