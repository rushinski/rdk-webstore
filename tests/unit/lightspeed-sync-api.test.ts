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
const applyEditChunkMock = jest.fn();
const applyRestoreChunkMock = jest.fn();
const applyArchiveChunkMock = jest.fn();
const scanPreviewChunkMock = jest.fn();

jest.mock("@/services/lightspeed-reconciliation-sync-service", () => ({
  LightspeedReconciliationSyncService: jest.fn().mockImplementation(() => ({
    preview: previewMock,
    apply: applyMock,
    applyImportChunk: applyImportChunkMock,
    applyEditChunk: applyEditChunkMock,
    applyRestoreChunk: applyRestoreChunkMock,
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
      noChangeCount: 3,
      importCount: 2,
      editCount: 4,
      restoreCount: 1,
      archiveCount: 1,
      conflictCount: 1,
      noChanges: [],
      edits: [],
      imports: [],
      restores: [],
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
        noChangeCount: 3,
        importCount: 2,
        editCount: 4,
        restoreCount: 1,
        archiveCount: 1,
        conflictCount: 1,
        noChanges: [],
        edits: [],
        imports: [],
        restores: [],
        archives: [],
        conflicts: [],
      },
      requestId: "req-preview",
    });
  });

  it("applies manual sync when requested", async () => {
    applyMock.mockResolvedValue({
      noChangeCount: 3,
      importedCount: 2,
      editedCount: 4,
      restoredCount: 1,
      archivedCount: 1,
      conflictCount: 1,
      failedCount: 0,
      resultItems: [
        {
          status: "success",
          operation: "import",
          remoteProductId: "ls-import-1",
          title: "Import Product",
          skuSample: "IMPORT-001",
          message: "Imported website product from Lightspeed.",
        },
      ],
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
        noChangeCount: 3,
        importedCount: 2,
        editedCount: 4,
        restoredCount: 1,
        archivedCount: 1,
        conflictCount: 1,
        failedCount: 0,
        resultItems: [
          {
            status: "success",
            operation: "import",
            remoteProductId: "ls-import-1",
            title: "Import Product",
            skuSample: "IMPORT-001",
            message: "Imported website product from Lightspeed.",
          },
        ],
      },
      requestId: "req-apply",
    });
  });

  it("applies an import chunk", async () => {
    applyImportChunkMock.mockResolvedValue({
      importedCount: 2,
      failedCount: 0,
      resultItems: [
        {
          status: "success",
          operation: "import",
          remoteProductId: "ls-1",
          title: "Product 1",
          skuSample: "SKU-1",
          message: "Imported website product from Lightspeed.",
        },
      ],
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
        resultItems: [
          {
            status: "success",
            operation: "import",
            remoteProductId: "ls-1",
            title: "Product 1",
            skuSample: "SKU-1",
            message: "Imported website product from Lightspeed.",
          },
        ],
      },
      requestId: "req-import-chunk",
    });
  });

  it("passes category overrides through on import chunks", async () => {
    applyImportChunkMock.mockResolvedValue({
      importedCount: 1,
      failedCount: 0,
      resultItems: [],
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-import-override",
        },
        body: JSON.stringify({
          action: "apply_import_chunk",
          remoteProductIds: ["ls-override-1"],
          categoryOverrides: [
            {
              remoteProductId: "ls-override-1",
              category: "clothing",
            },
          ],
        }),
      }),
    );

    expect(applyImportChunkMock).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      remoteProductIds: ["ls-override-1"],
      categoryOverrides: [
        {
          remoteProductId: "ls-override-1",
          category: "clothing",
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("applies an edit chunk", async () => {
    applyEditChunkMock.mockResolvedValue({
      editedCount: 2,
      failedCount: 0,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-edit-chunk",
        },
        body: JSON.stringify({
          action: "apply_edit_chunk",
          edits: [
            {
              websiteProductId: "11111111-1111-1111-8111-111111111111",
              remoteProductId: "ls-edit",
              reason: "link",
            },
          ],
        }),
      }),
    );

    expect(applyEditChunkMock).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      edits: [
        {
          websiteProductId: "11111111-1111-1111-8111-111111111111",
          remoteProductId: "ls-edit",
          reason: "link",
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("applies a restore chunk", async () => {
    applyRestoreChunkMock.mockResolvedValue({
      restoredCount: 1,
      failedCount: 0,
      resultItems: [
        {
          status: "success",
          operation: "restore",
          websiteProductId: "11111111-1111-1111-8111-111111111111",
          remoteProductId: "ls-restore",
          title: "Restore Product",
          skuSample: "RESTORE-001",
          message: "Restored archived website product from Lightspeed.",
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-restore-chunk",
        },
        body: JSON.stringify({
          action: "apply_restore_chunk",
          restores: [
            {
              websiteProductId: "11111111-1111-1111-8111-111111111111",
              remoteProductId: "ls-restore",
              reason: "sku",
            },
          ],
        }),
      }),
    );

    expect(applyRestoreChunkMock).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      restores: [
        {
          websiteProductId: "11111111-1111-1111-8111-111111111111",
          remoteProductId: "ls-restore",
          reason: "sku",
        },
      ],
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      result: {
        restoredCount: 1,
        failedCount: 0,
        resultItems: [
          {
            status: "success",
            operation: "restore",
            websiteProductId: "11111111-1111-1111-8111-111111111111",
            remoteProductId: "ls-restore",
            title: "Restore Product",
            skuSample: "RESTORE-001",
            message: "Restored archived website product from Lightspeed.",
          },
        ],
      },
      requestId: "req-restore-chunk",
    });
  });

  it("applies an archive chunk", async () => {
    applyArchiveChunkMock.mockResolvedValue({
      archivedCount: 1,
      failedCount: 0,
      resultItems: [
        {
          status: "success",
          operation: "archive",
          websiteProductId: "11111111-1111-1111-8111-111111111111",
          title: "Archive Product",
          skuSample: "ARCHIVE-001",
          message: "Archived website product missing from Lightspeed.",
        },
      ],
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
        resultItems: [
          {
            status: "success",
            operation: "archive",
            websiteProductId: "11111111-1111-1111-8111-111111111111",
            title: "Archive Product",
            skuSample: "ARCHIVE-001",
            message: "Archived website product missing from Lightspeed.",
          },
        ],
      },
      requestId: "req-archive-chunk",
    });
  });

  it("returns a preview scan chunk", async () => {
    scanPreviewChunkMock.mockResolvedValue({
      chunkIndex: 1,
      after: null,
      nextAfter: 100,
      pageSize: 25,
      processedCount: 25,
      totalRemoteProducts: 100,
      hasNextPage: true,
      nextPage: 2,
      preview: {
        noChangeCount: 10,
        importCount: 8,
        editCount: 4,
        restoreCount: 3,
        archiveCount: 0,
        conflictCount: 2,
        noChanges: [],
        edits: [],
        imports: [],
        restores: [],
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
          after: null,
          pageSize: 25,
          chunkIndex: 1,
        }),
      }),
    );

    expect(scanPreviewChunkMock).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      after: null,
      pageSize: 25,
      chunkIndex: 1,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      result: {
        chunkIndex: 1,
        after: null,
        nextAfter: 100,
        pageSize: 25,
        processedCount: 25,
        totalRemoteProducts: 100,
        hasNextPage: true,
        nextPage: 2,
        preview: {
          noChangeCount: 10,
          importCount: 8,
          editCount: 4,
          restoreCount: 3,
          archiveCount: 0,
          conflictCount: 2,
          noChanges: [],
          edits: [],
          imports: [],
          restores: [],
          archives: [],
          conflicts: [],
        },
        websiteCandidates: [],
      },
      requestId: "req-scan-chunk",
    });
  });

  it("accepts the legacy page-based preview scan payload", async () => {
    scanPreviewChunkMock.mockResolvedValue({
      chunkIndex: 1,
      after: null,
      nextAfter: 100,
      pageSize: 25,
      processedCount: 25,
      totalRemoteProducts: 100,
      hasNextPage: true,
      nextPage: 2,
      preview: {
        noChangeCount: 10,
        importCount: 8,
        editCount: 4,
        restoreCount: 3,
        archiveCount: 0,
        conflictCount: 2,
        noChanges: [],
        edits: [],
        imports: [],
        restores: [],
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
          "x-request-id": "req-scan-legacy",
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
      after: null,
      pageSize: 25,
      chunkIndex: 1,
    });
    expect(response.status).toBe(200);
  });
});
