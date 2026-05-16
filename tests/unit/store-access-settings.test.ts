import {
  DEFAULT_CHECKOUT_LOCK_MESSAGE,
  StoreAccessSettingsRepository,
} from "@/repositories/store-access-settings-repo";
import { StoreAccessSettingsService } from "@/services/store-access-settings-service";

type SelectChain = {
  select: jest.Mock<SelectChain, [string]>;
  eq: jest.Mock<SelectChain, [string, string]>;
  maybeSingle: jest.Mock<Promise<{ data: unknown; error: unknown }>, []>;
};

function createSupabaseMock(result: { data: unknown; error: unknown }) {
  const chain: SelectChain = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue(result);

  return {
    from: jest.fn(() => chain),
  };
}

describe("StoreAccessSettingsRepository", () => {
  it("returns defaults when a tenant has no persisted settings", async () => {
    const supabase = createSupabaseMock({ data: null, error: null });
    const repo = new StoreAccessSettingsRepository(supabase as never);

    await expect(repo.getByTenant("tenant-1")).resolves.toEqual({
      siteLockEnabled: false,
      siteUnlockAt: null,
      checkoutLockEnabled: false,
      checkoutLockMessage: DEFAULT_CHECKOUT_LOCK_MESSAGE,
    });
  });
});

describe("StoreAccessSettingsService", () => {
  it("treats enabled lock with a future unlock time as locked", () => {
    const service = new StoreAccessSettingsService({} as never);

    expect(
      service.isSiteLocked(
        {
          siteLockEnabled: true,
          siteUnlockAt: "2099-01-01T00:00:00.000Z",
        },
        new Date("2026-05-15T12:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("treats checkout lock as a direct toggle", () => {
    const service = new StoreAccessSettingsService({} as never);

    expect(service.isCheckoutLocked({ checkoutLockEnabled: true })).toBe(true);
    expect(service.isCheckoutLocked({ checkoutLockEnabled: false })).toBe(false);
  });
});
