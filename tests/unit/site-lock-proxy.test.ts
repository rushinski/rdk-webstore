jest.mock("@/lib/supabase/proxy", () => ({
  createSupabaseProxyClient: jest.fn(),
}));

jest.mock("@/lib/supabase/service-role", () => ({
  createSupabaseAdminClient: jest.fn(),
}));

jest.mock("@/repositories/tenant-repo", () => ({
  TenantRepository: jest.fn(),
}));

jest.mock("@/services/store-access-settings-service", () => ({
  StoreAccessSettingsService: jest.fn(),
}));

jest.mock("@/repositories/profile-repo", () => ({
  ProfileRepository: jest.fn(),
}));

jest.mock("@/lib/http/admin-session", () => ({
  verifyAdminSessionToken: jest.fn(),
}));

import { NextRequest } from "next/server";

import { createSupabaseProxyClient } from "@/lib/supabase/proxy";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { logError } from "@/lib/utils/log";
import { ProfileRepository } from "@/repositories/profile-repo";
import { TenantRepository } from "@/repositories/tenant-repo";
import { StoreAccessSettingsService } from "@/services/store-access-settings-service";
import { verifyAdminSessionToken } from "@/lib/http/admin-session";
import { checkSiteLock } from "@/proxy/site-lock";

const mockCreateSupabaseProxyClient = jest.mocked(createSupabaseProxyClient);
const mockCreateSupabaseAdminClient = jest.mocked(createSupabaseAdminClient);
const mockTenantRepository = jest.mocked(TenantRepository);
const mockStoreAccessSettingsService = jest.mocked(StoreAccessSettingsService);
const mockProfileRepository = jest.mocked(ProfileRepository);
const mockVerifyAdminSessionToken = jest.mocked(verifyAdminSessionToken);
jest.mock("@/lib/utils/log", () => ({
  logError: jest.fn(),
}));
const mockLogError = jest.mocked(logError);

describe("checkSiteLock", () => {
  const mockGetFirstTenantId = jest.fn();
  const mockGetSettings = jest.fn();
  const mockIsSiteLocked = jest.fn();
  const mockGetProfileByUserId = jest.fn();
  const mockGetUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSupabaseAdminClient.mockReturnValue({} as never);
    mockCreateSupabaseProxyClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    } as never);
    mockTenantRepository.mockImplementation(
      () =>
        ({
          getFirstTenantId: mockGetFirstTenantId,
        }) as never,
    );
    mockStoreAccessSettingsService.mockImplementation(
      () =>
        ({
          getSettings: mockGetSettings,
          isSiteLocked: mockIsSiteLocked,
        }) as never,
    );
    mockProfileRepository.mockImplementation(
      () =>
        ({
          getByUserId: mockGetProfileByUserId,
        }) as never,
    );
    mockGetFirstTenantId.mockResolvedValue("tenant-1");
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockGetProfileByUserId.mockResolvedValue(null);
    mockVerifyAdminSessionToken.mockResolvedValue(null);
  });

  it("does not lock when persisted settings disable site lock", async () => {
    mockGetSettings.mockResolvedValue({
      siteLockEnabled: false,
      siteUnlockAt: null,
      checkoutLockEnabled: false,
      checkoutLockMessage: "",
    });
    mockIsSiteLocked.mockReturnValue(false);

    const request = new NextRequest("http://localhost/store", {
      headers: { accept: "text/html" },
    });

    await expect(checkSiteLock(request, "req-1")).resolves.toBeNull();
  });

  it("redirects html navigation to /locked when persisted settings say the site is locked", async () => {
    mockGetSettings.mockResolvedValue({
      siteLockEnabled: true,
      siteUnlockAt: "2099-01-01T00:00:00.000Z",
      checkoutLockEnabled: false,
      checkoutLockMessage: "",
    });
    mockIsSiteLocked.mockReturnValue(true);

    const request = new NextRequest("http://localhost/store?brand=nike", {
      headers: { accept: "text/html" },
    });

    const response = await checkSiteLock(request, "req-2");

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toContain("/locked");
    expect(response?.headers.get("location")).toContain(
      encodeURIComponent("/store?brand=nike"),
    );
  });

  it("allows signed-in admins through when the site is locked", async () => {
    mockGetSettings.mockResolvedValue({
      siteLockEnabled: true,
      siteUnlockAt: "2099-01-01T00:00:00.000Z",
      checkoutLockEnabled: false,
      checkoutLockMessage: "",
    });
    mockIsSiteLocked.mockReturnValue(true);
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetProfileByUserId.mockResolvedValue({
      role: "admin",
    });

    const request = new NextRequest("http://localhost/store", {
      headers: { accept: "text/html" },
    });

    await expect(checkSiteLock(request, "req-admin")).resolves.toBeNull();
  });

  it("fails open when lock settings lookup throws", async () => {
    mockGetSettings.mockRejectedValue(
      new Error("relation tenant_store_access_settings does not exist"),
    );

    const request = new NextRequest("http://localhost/", {
      headers: { accept: "text/html" },
    });

    await expect(checkSiteLock(request, "req-3")).resolves.toBeNull();
    expect(mockLogError).toHaveBeenCalled();
  });
});
