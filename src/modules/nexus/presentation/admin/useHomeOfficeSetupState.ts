"use client";

import { useState } from "react";

import type {
  ExistingAddress,
  HomeOfficeFormData,
  OldHomeOfficeAction,
} from "@/modules/nexus/presentation/admin/homeOfficeSetupTypes";

export function useHomeOfficeSetupState() {
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

  return {
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
  };
}
