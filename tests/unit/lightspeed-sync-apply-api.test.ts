jest.mock("@/lib/auth/session", () => ({
  requireAdminApi: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/lib/auth/tenant", () => ({
  ensureTenantId: jest.fn(),
}));

jest.mock("@/services/lightspeed-sync-apply-service", () => ({
  LightspeedSyncApplyService: jest.fn(),
  createArchiveLightspeedProductExecutor: jest.fn(() => ({
    archiveLightspeedProduct: jest.fn(),
  })),
}));

import type { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LightspeedSyncApplyService } from "@/services/lightspeed-sync-apply-service";

import { POST } from "../../app/api/admin/lightspeed/sync/apply/route";

const mockRequireAdminApi = jest.mocked(requireAdminApi);
const mockEnsureTenantId = jest.mocked(ensureTenantId);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockLightspeedSyncApplyService = jest.mocked(LightspeedSyncApplyService);

describe("/api/admin/lightspeed/sync/apply", () => {
  const mockApplySync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminApi.mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" },
      profile: null,
      role: "admin",
    } as never);
    mockEnsureTenantId.mockResolvedValue("tenant-1");
    mockCreateSupabaseServerClient.mockResolvedValue({ from: jest.fn() } as never);
    mockLightspeedSyncApplyService.mockImplementation(
      () =>
        ({
          applySync: mockApplySync,
        }) as never,
    );
  });

  it("returns 400 for an invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-1",
        },
        body: JSON.stringify({ syncRunId: "not-a-uuid", mode: "broken" }),
      }) as NextRequest,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid payload",
      requestId: "req-1",
    });
  });

  it("returns the apply result for a valid payload", async () => {
    mockApplySync.mockResolvedValue({
      syncRunId: "run-1",
      summary: {
        applied: 1,
        rejected: 0,
        failed: 0,
      },
      items: [],
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-2",
        },
        body: JSON.stringify({
          syncRunId: "11111111-1111-4111-8111-111111111111",
          mode: "accept_all",
        }),
      }) as NextRequest,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      result: {
        syncRunId: "run-1",
        summary: {
          applied: 1,
          rejected: 0,
          failed: 0,
        },
        items: [],
      },
      requestId: "req-2",
    });
  });
});
