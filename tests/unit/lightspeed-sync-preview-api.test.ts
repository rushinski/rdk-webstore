jest.mock("@/lib/auth/session", () => ({
  requireAdminApi: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/lib/auth/tenant", () => ({
  ensureTenantId: jest.fn(),
}));

jest.mock("@/services/lightspeed-sync-preview-service", () => ({
  LightspeedSyncPreviewService: jest.fn(),
}));

import type { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureTenantId } from "@/lib/auth/tenant";
import { LightspeedSyncPreviewService } from "@/services/lightspeed-sync-preview-service";

import { POST } from "../../app/api/admin/lightspeed/sync/preview/route";

const mockRequireAdminApi = jest.mocked(requireAdminApi);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockEnsureTenantId = jest.mocked(ensureTenantId);
const mockLightspeedSyncPreviewService = jest.mocked(LightspeedSyncPreviewService);

describe("/api/admin/lightspeed/sync/preview", () => {
  const mockPreviewSync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminApi.mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" },
      profile: null,
      role: "admin",
    } as never);
    mockCreateSupabaseServerClient.mockResolvedValue({ from: jest.fn() } as never);
    mockEnsureTenantId.mockResolvedValue("tenant-1");
    mockLightspeedSyncPreviewService.mockImplementation(
      () =>
        ({
          previewSync: mockPreviewSync,
        }) as never,
    );
  });

  it("returns 400 for an invalid POST payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync/preview", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-1",
        },
        body: JSON.stringify({ sourceOfTruth: "invalid" }),
      }) as NextRequest,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid payload",
      requestId: "req-1",
    });
  });

  it("returns a preview for a valid POST payload", async () => {
    mockPreviewSync.mockResolvedValue({
      syncRunId: "run-1",
      summary: {
        added: 1,
        modified: 0,
        archived: 0,
        conflicts: 0,
        skipped: 0,
      },
      groups: {
        added: [],
        modified: [],
        archived: [],
        conflicts: [],
        skipped: [],
      },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync/preview", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-2",
        },
        body: JSON.stringify({ sourceOfTruth: "lightspeed_inventory" }),
      }) as NextRequest,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      preview: {
        syncRunId: "run-1",
        summary: {
          added: 1,
          modified: 0,
          archived: 0,
          conflicts: 0,
          skipped: 0,
        },
        groups: {
          added: [],
          modified: [],
          archived: [],
          conflicts: [],
          skipped: [],
        },
      },
      requestId: "req-2",
    });
  });
});
