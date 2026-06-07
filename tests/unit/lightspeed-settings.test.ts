jest.mock("@/config/env", () => ({
  env: {
    LIGHTSPEED_ACCESS_TOKEN: "env-access-token",
    LIGHTSPEED_DOMAIN_PREFIX: "env-domain-prefix",
    LIGHTSPEED_WEBHOOK_SIGNING_SECRET: "",
  },
}));

import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";

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

describe("LightspeedSettingsRepository", () => {
  it("returns defaults when a tenant has no persisted settings", async () => {
    const supabase = createSupabaseMock({ data: null, error: null });
    const repo = new LightspeedSettingsRepository(supabase as never);

    await expect(repo.getByTenant("tenant-1")).resolves.toEqual({
      syncEnabled: false,
      domainPrefix: null,
      retailerId: null,
    });
  });

  it("falls back to env-backed private token connection details", async () => {
    const supabase = createSupabaseMock({ data: null, error: null });
    const repo = new LightspeedSettingsRepository(supabase as never);

    await expect(repo.getConnectionByTenant("tenant-1")).resolves.toEqual({
      syncEnabled: false,
      domainPrefix: "env-domain-prefix",
      accessToken: "env-access-token",
      webhookSigningSecret: null,
    });
  });

  it("matches tenants by retailer_id before falling back to domain_prefix", async () => {
    const retailerChain = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn(),
    };
    retailerChain.select.mockReturnValue(retailerChain);
    retailerChain.eq.mockReturnValue(retailerChain);
    retailerChain.maybeSingle.mockResolvedValueOnce({
      data: { tenant_id: "tenant-1" },
      error: null,
    });

    const supabase = {
      from: jest.fn(() => retailerChain),
    };

    const repo = new LightspeedSettingsRepository(supabase as never);

    await expect(
      repo.findTenantIdByRetailerOrDomainPrefix({
        retailerId: "retailer-1",
        domainPrefix: "demo-store",
      }),
    ).resolves.toBe("tenant-1");

    expect(retailerChain.eq).toHaveBeenCalledWith("retailer_id", "retailer-1");
  });
});
