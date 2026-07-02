"use client";

import type { NexusData } from "@/types/domain/nexus";

type HomeOfficeStatusResponse = {
  configured: boolean;
};

type NexusMutationResponse = {
  error?: string;
};

export async function loadNexusSummaryRequest() {
  const response = await fetch("/api/admin/nexus/summary", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  return (await response.json()) as NexusData;
}

export async function loadHomeOfficeStatusRequest() {
  const response = await fetch("/api/admin/nexus/home-office-status");

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  return (await response.json()) as HomeOfficeStatusResponse;
}

export async function updateNexusRegistrationRequest({
  isRegistered,
  nexusType,
  stateCode,
}: {
  isRegistered: boolean;
  nexusType: "physical" | "economic";
  stateCode: string;
}) {
  const response = await fetch("/api/admin/nexus/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stateCode,
      registrationType: nexusType,
      isRegistered,
    }),
  });

  const result = (await response.json().catch(() => ({}))) as NexusMutationResponse;

  if (!response.ok) {
    throw new Error(result.error || "Failed to update registration");
  }

  return result;
}

export async function updateNexusTypeRequest({
  nexusType,
  stateCode,
}: {
  nexusType: "physical" | "economic";
  stateCode: string;
}) {
  const response = await fetch("/api/admin/nexus/nexus-type", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stateCode,
      nexusType,
    }),
  });

  const result = (await response.json().catch(() => ({}))) as NexusMutationResponse;

  if (!response.ok) {
    throw new Error(result.error || "Failed to update nexus type");
  }

  return result;
}
