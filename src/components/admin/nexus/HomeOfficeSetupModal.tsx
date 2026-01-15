// src/components/admin/nexus/HomeOfficeSetupModal.tsx
"use client";

import React, { useMemo, useState } from "react";
import { X, Building } from "lucide-react";
import { STATE_NAMES } from "@/config/constants/nexus-thresholds";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { RdkSelect } from "@/components/ui/Select";

type HomeOfficeSetupModalProps = {
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
};

export default function HomeOfficeSetupModal({ onClose, onSuccess, title }: HomeOfficeSetupModalProps) {
  const [formData, setFormData] = useState({
    stateCode: "",
    businessName: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateOptions = useMemo(
    () =>
      Object.entries(STATE_NAMES).map(([code, name]) => ({
        value: code,
        label: `${name} (${code})`,
      })),
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.stateCode || !formData.line1 || !formData.city || !formData.postalCode) {
      setError("Please fill in all required fields");
      return;
    }

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
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to setup home office");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to setup home office");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <h2 className="text-xl font-semibold text-white">{title ?? "Setup Home Office"}</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Configure your business address to enable tax registrations
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 border border-zinc-800/70 hover:border-zinc-600 rounded-sm">
            <X className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded-sm text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Business Name (Optional)</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
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
                {isSubmitting ? "Setting up..." : "Setup Home Office"}
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
              <strong className="text-zinc-200">Note:</strong> This address will be used as your tax registration
              headquarters with Stripe Tax. It will automatically register your home state as having physical nexus.
            </p>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
