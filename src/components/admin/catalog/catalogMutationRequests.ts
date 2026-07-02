"use client";

import type { Candidate } from "./types";

export async function createCatalogBrandRequest({
  canonicalLabel,
  groupId,
}: {
  canonicalLabel: string;
  groupId: string;
}) {
  return fetch("/api/admin/catalog/brands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId, canonicalLabel }),
  });
}

export async function createCatalogModelRequest({
  brandId,
  canonicalLabel,
}: {
  brandId: string;
  canonicalLabel: string;
}) {
  return fetch("/api/admin/catalog/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brandId, canonicalLabel }),
  });
}

export async function createCatalogAliasRequest({
  aliasLabel,
  brandId,
  entityType,
  modelId,
  priority,
}: {
  aliasLabel: string;
  brandId: string | null;
  entityType: "brand" | "model";
  modelId: string | null;
  priority: number;
}) {
  return fetch("/api/admin/catalog/aliases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entityType,
      brandId,
      modelId,
      aliasLabel,
      priority,
    }),
  });
}

export async function acceptCatalogCandidateRequest(
  candidate: Candidate,
  defaultGroupId: string | null,
) {
  const payload =
    candidate.entity_type === "brand" && defaultGroupId
      ? { groupId: defaultGroupId }
      : {};

  return fetch(`/api/admin/catalog/candidates/${candidate.id}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function rejectCatalogCandidateRequest(candidateId: string) {
  return fetch(`/api/admin/catalog/candidates/${candidateId}/reject`, {
    method: "POST",
  });
}

export async function updateCatalogBrandRequest(
  brandId: string,
  payload: {
    canonicalLabel: string;
    isActive: boolean;
    isVerified: boolean;
  },
) {
  return fetch(`/api/admin/catalog/brands/${brandId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateCatalogModelRequest(
  modelId: string,
  payload: {
    brandId: string;
    canonicalLabel: string;
    isActive: boolean;
    isVerified: boolean;
  },
) {
  return fetch(`/api/admin/catalog/models/${modelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateCatalogAliasRequest(
  aliasId: string,
  payload: {
    aliasLabel: string;
    priority: number;
    isActive: boolean;
  },
) {
  return fetch(`/api/admin/catalog/aliases/${aliasId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deactivateCatalogBrandRequest(brandId: string) {
  return updateCatalogBrandRequest(brandId, {
    canonicalLabel: "",
    isActive: false,
    isVerified: false,
  });
}

export async function deactivateCatalogModelRequest(modelId: string) {
  return updateCatalogModelRequest(modelId, {
    brandId: "",
    canonicalLabel: "",
    isActive: false,
    isVerified: false,
  });
}

export async function deactivateCatalogAliasRequest(aliasId: string) {
  return updateCatalogAliasRequest(aliasId, {
    aliasLabel: "",
    priority: 0,
    isActive: false,
  });
}
