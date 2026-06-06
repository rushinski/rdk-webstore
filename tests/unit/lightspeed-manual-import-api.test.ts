jest.mock("@/lib/auth/session", () => ({
  requireAdminApi: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/lib/auth/tenant", () => ({
  ensureTenantId: jest.fn(),
}));

jest.mock("@/services/lightspeed-manual-import-service", () => ({
  LightspeedManualImportService: jest.fn(),
}));

import { requireAdminApi } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureTenantId } from "@/lib/auth/tenant";
import { LightspeedManualImportService } from "@/services/lightspeed-manual-import-service";

import { POST } from "../../app/api/admin/lightspeed/import/route";

const mockRequireAdminApi = jest.mocked(requireAdminApi);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockEnsureTenantId = jest.mocked(ensureTenantId);
const mockLightspeedManualImportService = jest.mocked(LightspeedManualImportService);

describe("/api/admin/lightspeed/import", () => {
  const mockImportProducts = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminApi.mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" },
      role: "admin",
    } as never);
    mockCreateSupabaseServerClient.mockResolvedValue({ from: jest.fn() } as never);
    mockEnsureTenantId.mockResolvedValue("tenant-1");
    mockLightspeedManualImportService.mockImplementation(
      () =>
        ({
          importProducts: mockImportProducts,
        }) as never,
    );
  });

  it("runs a manual Lightspeed import for the tenant", async () => {
    mockImportProducts.mockResolvedValue({
      status: "completed",
      scanned: 2,
      applied: 1,
      skipped: 1,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/import", {
        method: "POST",
        headers: { "x-request-id": "req-1" },
      }),
    );

    expect(mockImportProducts).toHaveBeenCalledWith({ tenantId: "tenant-1" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      result: {
        status: "completed",
        scanned: 2,
        applied: 1,
        skipped: 1,
      },
      requestId: "req-1",
    });
  });
});
