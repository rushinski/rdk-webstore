jest.mock("@/lib/auth/session", () => ({
  requireAdminApi: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/lib/auth/tenant", () => ({
  ensureTenantId: jest.fn(),
}));

const previewMock = jest.fn();
const applyMock = jest.fn();
const applyImportChunkMock = jest.fn();
const applyArchiveChunkMock = jest.fn();
const scanPreviewChunkMock = jest.fn();

jest.mock("@/services/lightspeed-reconciliation-sync-service", () => ({
  LightspeedReconciliationSyncService: jest.fn().mockImplementation(() => ({
    preview: previewMock,
    apply: applyMock,
    applyImportChunk: applyImportChunkMock,
    applyArchiveChunk: applyArchiveChunkMock,
    scanPreviewChunk: scanPreviewChunkMock,
  })),
}));

import { requireAdminApi } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureTenantId } from "@/lib/auth/tenant";

import { GET, POST } from "../../app/api/admin/lightspeed/sync/route";

const mockRequireAdminApi = jest.mocked(requireAdminApi);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockEnsureTenantId = jest.mocked(ensureTenantId);

describe("/api/admin/lightspeed/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminApi.mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" },
      role: "admin",
    } as never);
    mockCreateSupabaseServerClient.mockResolvedValue({ from: jest.fn() } as never);
    mockEnsureTenantId.mockResolvedValue("tenant-1");
  });

  it("returns a preview summary for manual sync", async () => {
    previewMock.mockResolvedValue({
      matchedCount: 3,
      importCount: 2,
      archiveCount: 1,
      conflictCount: 1,
      matched: [],
      imports: [],
      archives: [],
      conflicts: [],
    });

    const response = await GET(
      new Request("http://localhost/api/admin/lightspeed/sync", {
        method: "GET",
        headers: { "x-request-id": "req-preview" },
      }),
    );

    expect(previewMock).toHaveBeenCalledWith({ tenantId: "tenant-1" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      preview: {
        matchedCount: 3,
        importCount: 2,
        archiveCount: 1,
        conflictCount: 1,
        matched: [],
        imports: [],
        archives: [],
        conflicts: [],
      },
      requestId: "req-preview",
    });
  });

  it("applies manual sync when requested", async () => {
    applyMock.mockResolvedValue({
      matchedCount: 3,
      importedCount: 2,
      archivedCount: 1,
      conflictCount: 1,
      failedCount: 0,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-apply",
        },
        body: JSON.stringify({ action: "apply" }),
      }),
    );

    expect(applyMock).toHaveBeenCalledWith({ tenantId: "tenant-1" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      result: {
        matchedCount: 3,
        importedCount: 2,
        archivedCount: 1,
        conflictCount: 1,
        failedCount: 0,
      },
      requestId: "req-apply",
    });
  });

  it("applies an import chunk", async () => {
    applyImportChunkMock.mockResolvedValue({
      importedCount: 2,
      failedCount: 0,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-import-chunk",
        },
        body: JSON.stringify({
          action: "apply_import_chunk",
          remoteProductIds: ["ls-1", "ls-2"],
        }),
      }),
    );

    expect(applyImportChunkMock).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      remoteProductIds: ["ls-1", "ls-2"],
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      result: {
        importedCount: 2,
        failedCount: 0,
      },
      requestId: "req-import-chunk",
    });
  });

  it("applies an archive chunk", async () => {
    applyArchiveChunkMock.mockResolvedValue({
      archivedCount: 1,
      failedCount: 0,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-archive-chunk",
        },
        body: JSON.stringify({
          action: "apply_archive_chunk",
          websiteProductIds: ["11111111-1111-1111-8111-111111111111"],
        }),
      }),
    );

    expect(applyArchiveChunkMock).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      websiteProductIds: ["11111111-1111-1111-8111-111111111111"],
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      result: {
        archivedCount: 1,
        failedCount: 0,
      },
      requestId: "req-archive-chunk",
    });
  });

  it("returns a preview scan chunk", async () => {
    scanPreviewChunkMock.mockResolvedValue({
      page: 1,
      pageSize: 25,
      processedCount: 25,
      totalRemoteProducts: 100,
      hasNextPage: true,
      nextPage: 2,
      preview: {
        matchedCount: 10,
        importCount: 8,
        archiveCount: 0,
        conflictCount: 2,
        matched: [],
        imports: [],
        archives: [],
        conflicts: [],
      },
      websiteCandidates: [],
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-scan-chunk",
        },
        body: JSON.stringify({
          action: "scan_preview_chunk",
          page: 1,
          pageSize: 25,
        }),
      }),
    );

    expect(scanPreviewChunkMock).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      page: 1,
      pageSize: 25,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      result: {
        page: 1,
        pageSize: 25,
        processedCount: 25,
        totalRemoteProducts: 100,
        hasNextPage: true,
        nextPage: 2,
        preview: {
          matchedCount: 10,
          importCount: 8,
          archiveCount: 0,
          conflictCount: 2,
          matched: [],
          imports: [],
          archives: [],
          conflicts: [],
        },
        websiteCandidates: [],
      },
      requestId: "req-scan-chunk",
    });
  });
});
