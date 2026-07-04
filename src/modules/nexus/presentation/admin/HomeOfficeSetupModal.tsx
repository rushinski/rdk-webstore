"use client";

import React, { useEffect, useMemo } from "react";

import { HomeOfficeAddressForm } from "@/modules/nexus/presentation/admin/HomeOfficeAddressForm";
import { HomeOfficeChangeImpactModal } from "@/modules/nexus/presentation/admin/HomeOfficeChangeImpactModal";
import {
  loadHomeOfficeSetupDataRequest,
  submitHomeOfficeSetupRequest,
} from "@/modules/nexus/presentation/admin/homeOfficeSetupRequests";
import { useHomeOfficeSetupState } from "@/modules/nexus/presentation/admin/useHomeOfficeSetupState";
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
  const {
    error,
    existingAddress,
    formData,
    isLoading,
    isSubmitting,
    oldHomeAction,
    oldHomeState,
    setError,
    setExistingAddress,
    setFormData,
    setIsLoading,
    setIsSubmitting,
    setOldHomeAction,
    setOldHomeState,
    setShowOldHomeAction,
    showOldHomeAction,
  } = useHomeOfficeSetupState();

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
      const { address, homeState } = await loadHomeOfficeSetupDataRequest();
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
      setOldHomeState(homeState);
    } catch (err) {
      logError(err, { layer: "frontend", event: "nexus_home_office_fetch_failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const submitHomeOffice = async () => {
    try {
      setIsSubmitting(true);
      await submitHomeOfficeSetupRequest({
        formData,
        isConfigured,
        oldHomeAction,
        oldHomeState,
      });
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to setup home office";
      setError(message);
      setShowOldHomeAction(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
