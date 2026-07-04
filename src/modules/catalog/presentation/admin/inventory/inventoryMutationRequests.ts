"use client";

import {
  buildInventoryBulkMutationRequest,
  buildInventoryItemActionUrl,
  buildInventoryItemRequestInit,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientMutations";

export type InventoryBulkSelectionArgs = Parameters<
  typeof buildInventoryBulkMutationRequest
>[0];

export async function deleteInventoryItemRequest(productId: string) {
  return fetch(
    buildInventoryItemActionUrl(productId),
    buildInventoryItemRequestInit("DELETE"),
  );
}

export async function deleteInventorySelectionRequest(
  selectionArgs: InventoryBulkSelectionArgs,
) {
  return fetch("/api/admin/products", buildInventoryBulkMutationRequest(selectionArgs));
}

export async function restoreInventoryItemRequest(productId: string) {
  return fetch(
    buildInventoryItemActionUrl(productId, "restore"),
    buildInventoryItemRequestInit("PATCH"),
  );
}

export async function restoreInventorySelectionRequest(
  selectionArgs: InventoryBulkSelectionArgs,
) {
  return fetch("/api/admin/products", buildInventoryBulkMutationRequest(selectionArgs));
}

export async function duplicateInventoryItemRequest(productId: string) {
  return fetch(
    `${buildInventoryItemActionUrl(productId)}/duplicate`,
    buildInventoryItemRequestInit("POST"),
  );
}

export async function archiveInventoryItemRequest(productId: string) {
  return fetch(
    buildInventoryItemActionUrl(productId, "archive"),
    buildInventoryItemRequestInit("PATCH"),
  );
}

export async function archiveInventorySelectionRequest(
  selectionArgs: InventoryBulkSelectionArgs,
) {
  return fetch("/api/admin/products", buildInventoryBulkMutationRequest(selectionArgs));
}
