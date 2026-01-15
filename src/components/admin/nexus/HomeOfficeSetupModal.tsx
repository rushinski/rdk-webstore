// src/components/admin/nexus/HomeOfficeSetupModal.tsx
"use client";

import React, { useState } from "react";
import { X, Building } from "lucide-react";
import { STATE_NAMES } from "@/config/constants/nexus-thresholds";

type HomeOfficeSetupModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function HomeOfficeSetupModal({
  onClose,
  onSuccess,
}: HomeOfficeSetupModalProps) {
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

      if (!res.ok) {
        throw new Error(result.error || "Failed to setup home office");
      }

      onSuccess();
    } catch (err: any) {
      console.error("Failed to setup home office:", err);
      setError(err.message || "Failed to setup home office");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Setup Home Office</h2>
              <p className="text-sm text-gray-400 mt-1">
                Configure your business address to enable tax registrations
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Business Name (Optional)
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) =>
                setFormData({ ...formData, businessName: e.target.value })
              }
              className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none"
              placeholder="Your Business Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Home State <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.stateCode}
              onChange={(e) =>
                setFormData({ ...formData, stateCode: e.target.value })
              }
              className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">Select a state</option>
              {Object.entries(STATE_NAMES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.line1}
              onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none"
              placeholder="123 Main Street"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.line2}
              onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none"
              placeholder="Suite 100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none"
                placeholder="Charleston"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) =>
                  setFormData({ ...formData, postalCode: e.target.value })
                }
                className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none"
                placeholder="29401"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Setting up..." : "Setup Home Office"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> This address will be used as your tax registration
            headquarters with Stripe Tax. It will automatically register your home state
            as having physical nexus.
          </p>
        </div>
      </div>
    </div>
  );
}