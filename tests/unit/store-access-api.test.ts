jest.mock("@/lib/auth/session", () => ({
  requireAdminApi: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/lib/auth/tenant", () => ({
  ensureTenantId: jest.fn(),
}));

jest.mock("@/services/store-access-settings-service", () => ({
  StoreAccessSettingsService: jest.fn(),
}));

import { storeAccessSettingsSchema } from "@/lib/validation/admin";
import { requireAdminApi } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureTenantId } from "@/lib/auth/tenant";
import { StoreAccessSettingsService } from "@/services/store-access-settings-service";

import { GET, POST } from "../../app/api/admin/store-access/route";

const mockRequireAdminApi = jest.mocked(requireAdminApi);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockEnsureTenantId = jest.mocked(ensureTenantId);
const mockStoreAccessSettingsService = jest.mocked(StoreAccessSettingsService);

describe("storeAccessSettingsSchema", () => {
  it("accepts a valid payload", () => {
    expect(
      storeAccessSettingsSchema.parse({
        checkoutLockEnabled: false,
        checkoutLockMessage: "Temporarily unavailable",
      }),
    ).toEqual({
      checkoutLockEnabled: false,
      checkoutLockMessage: "Temporarily unavailable",
    });
  });
});

describe("/api/admin/store-access", () => {
  const mockGetSettings = jest.fn();
  const mockSaveSettings = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminApi.mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" },
      profile: null,
      role: "admin",
    } as never);
    mockCreateSupabaseServerClient.mockResolvedValue({ from: jest.fn() } as never);
    mockEnsureTenantId.mockResolvedValue("tenant-1");
    mockStoreAccessSettingsService.mockImplementation(
      () =>
        ({
          getSettings: mockGetSettings,
          saveSettings: mockSaveSettings,
        }) as never,
    );
  });

  it("returns settings on GET", async () => {
    mockGetSettings.mockResolvedValue({
      checkoutLockEnabled: false,
      checkoutLockMessage: "Temporarily unavailable",
    });

    const response = await GET(
      new Request("http://localhost/api/admin/store-access", {
        headers: { "x-request-id": "req-1" },
      }),
    );

    await expect(response.json()).resolves.toEqual({
      settings: {
        checkoutLockEnabled: false,
        checkoutLockMessage: "Temporarily unavailable",
      },
      requestId: "req-1",
    });
  });

  it("returns 400 for an invalid POST payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/store-access", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-2",
        },
        body: JSON.stringify({
          checkoutLockEnabled: "yes",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid payload",
      requestId: "req-2",
    });
  });
});
