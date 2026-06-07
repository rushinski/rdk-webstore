jest.mock("@/lib/auth/session", () => ({
  requireAdminApi: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/lib/auth/tenant", () => ({
  ensureTenantId: jest.fn(),
}));

jest.mock("@/repositories/lightspeed-settings-repo", () => ({
  LightspeedSettingsRepository: jest.fn(),
}));

import { lightspeedSettingsSchema } from "@/lib/validation/admin";
import { requireAdminApi } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureTenantId } from "@/lib/auth/tenant";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";

import { GET, POST } from "../../app/api/admin/lightspeed/settings/route";

const mockRequireAdminApi = jest.mocked(requireAdminApi);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockEnsureTenantId = jest.mocked(ensureTenantId);
const mockLightspeedSettingsRepository = jest.mocked(LightspeedSettingsRepository);

describe("lightspeedSettingsSchema", () => {
  it("accepts a valid payload", () => {
    expect(
      lightspeedSettingsSchema.parse({
        syncEnabled: true,
        domainPrefix: "store-1",
      }),
    ).toEqual({
      syncEnabled: true,
      domainPrefix: "store-1",
    });
  });
});

describe("/api/admin/lightspeed/settings", () => {
  const mockGetByTenant = jest.fn();
  const mockUpsert = jest.fn();

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
          getByTenant: mockGetByTenant,
          upsert: mockUpsert,
        }) as never,
    );
  });

  it("returns settings on GET", async () => {
    mockGetByTenant.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "store-1",
      retailerId: null,
    });

    const response = await GET(
      new Request("http://localhost/api/admin/lightspeed/settings", {
        headers: { "x-request-id": "req-1" },
      }),
    );

    await expect(response.json()).resolves.toEqual({
      settings: {
        syncEnabled: true,
        domainPrefix: "store-1",
      },
      requestId: "req-1",
    });
  });

  it("returns 400 for an invalid POST payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/lightspeed/settings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-2",
        },
        body: JSON.stringify({
          syncEnabled: "yes",
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
