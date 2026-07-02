"use client";

import React, { useEffect, useMemo, useState } from "react";

import { HomeOfficeAddressForm } from "@/components/admin/nexus/HomeOfficeAddressForm";
import { HomeOfficeChangeImpactModal } from "@/components/admin/nexus/HomeOfficeChangeImpactModal";
import type {
  ExistingAddress,
  HomeOfficeFormData,
  OldHomeOfficeAction,
} from "@/components/admin/nexus/homeOfficeSetupTypes";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { STATE_NAMES } from "@/config/constants/nexus-thresholds";
import { logError } from "@/lib/utils/log";

type HomeOfficeSetupModalProps = {
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  isConfigured?: boolean;
};

export default function HomeOfficeSetupModal({
  onClose,
  onSuccess,
  title,
  isConfigured = false,
}: HomeOfficeSetupModalProps) {
  const [formData, setFormData] = useState<HomeOfficeFormData>({
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
      logError(err, { layer: "frontend", event: "nexus_home_office_fetch_failed" });
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
      <HomeOfficeChangeImpactModal
        error={error}
        formData={formData}
        isSubmitting={isSubmitting}
        oldHomeAction={oldHomeAction}
        oldHomeState={oldHomeState}
        onClose={() => setShowOldHomeAction(false)}
        onConfirm={() => {
          void submitHomeOffice();
        }}
        onOldHomeActionChange={setOldHomeAction}
      />
    );
  }

  return (
    <HomeOfficeAddressForm
      error={error}
      existingAddress={existingAddress}
      formData={formData}
      isConfigured={isConfigured}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onFormDataChange={setFormData}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      stateOptions={stateOptions}
      title={title}
    />
  );
}
