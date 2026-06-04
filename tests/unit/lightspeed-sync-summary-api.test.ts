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

jest.mock("@/repositories/lightspeed-settings-repo", () => ({
  LightspeedSettingsRepository: jest.fn(),
}));

jest.mock("@/repositories/lightspeed-sync-runs-repo", () => ({
  LightspeedSyncRunsRepository: jest.fn(),
}));

import type { NextRequest } from "next/server";

import { ensureTenantId } from "@/lib/auth/tenant";
import { requireAdminApi } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { LightspeedSyncRunsRepository } from "@/repositories/lightspeed-sync-runs-repo";
import { LightspeedSyncPreviewService } from "@/services/lightspeed-sync-preview-service";

import { GET, POST } from "../../app/api/admin/lightspeed/sync/summary/route";

const mockRequireAdminApi = jest.mocked(requireAdminApi);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockEnsureTenantId = jest.mocked(ensureTenantId);
const mockLightspeedSettingsRepository = jest.mocked(LightspeedSettingsRepository);
const mockLightspeedSyncRunsRepository = jest.mocked(LightspeedSyncRunsRepository);
const mockLightspeedSyncPreviewService = jest.mocked(LightspeedSyncPreviewService);

describe("/api/admin/lightspeed/sync/summary", () => {
  const mockSummarizeSync = jest.fn();
  const mockCreateRun = jest.fn();
  const mockGetRun = jest.fn();
  const mockUpdateRun = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminApi.mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" },
      profile: null,
      role: "admin",
    } as never);
    mockCreateSupabaseServerClient.mockResolvedValue({ from: jest.fn() } as never);
    mockEnsureTenantId.mockResolvedValue("tenant-1");
    mockLightspeedSettingsRepository.mockImplementation(
      () =>
        ({
          getConnectionByTenant: jest.fn().mockResolvedValue({
            syncEnabled: false,
            domainPrefix: null,
            accessToken: null,
            webhookSigningSecret: null,
          }),
        }) as never,
    );
    mockLightspeedSyncRunsRepository.mockImplementation(
      () =>
        ({
          createRun: mockCreateRun,
          getRun: mockGetRun,
          updateRun: mockUpdateRun,
        }) as never,
    );
    mockLightspeedSyncPreviewService.mockImplementation(
      () =>
        ({
          previewSync: jest.fn(),
          summarizeSync: mockSummarizeSync,
        }) as never,
    );
  });

  it("starts an async summary run for a valid POST payload", async () => {
    mockCreateRun.mockResolvedValue({ id: "run-1" });
    mockSummarizeSync.mockResolvedValue({
      totalProducts: 2000,
      totalPages: 40,
      totalGroupedItems: 1600,
      totalChanges: 812,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync/summary", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-3",
        },
        body: JSON.stringify({
          sourceOfTruth: "lightspeed_full_override",
          pageSize: 50,
        }),
      }) as NextRequest,
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      syncRunId: "run-1",
      status: "summary_pending",
      requestId: "req-3",
    });
  });

  it("returns stored summary job status for a valid GET request", async () => {
    mockGetRun.mockResolvedValue({
      id: "run-1",
      status: "summary_complete",
      summary: {
        totalProducts: 2000,
        totalPages: 40,
        totalGroupedItems: 1600,
        totalChanges: 812,
      },
    });

    const response = await GET(
      new Request("http://localhost/api/admin/lightspeed/sync/summary?syncRunId=run-1", {
        method: "GET",
        headers: {
          "x-request-id": "req-4",
        },
      }) as NextRequest,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: {
        totalProducts: 2000,
        totalPages: 40,
        totalGroupedItems: 1600,
        totalChanges: 812,
      },
      status: "summary_complete",
      syncRunId: "run-1",
      requestId: "req-4",
    });
  });
});
