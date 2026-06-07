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
      syncEnabled: true,
      domainPrefix: "env-domain-prefix",
      retailerId: null,
    });
  });

  it("falls back to env-backed private token connection details", async () => {
    const supabase = createSupabaseMock({ data: null, error: null });
    const repo = new LightspeedSettingsRepository(supabase as never);

    await expect(repo.getConnectionByTenant("tenant-1")).resolves.toEqual({
      syncEnabled: true,
      domainPrefix: "env-domain-prefix",
      accessToken: "env-access-token",
      webhookSigningSecret: null,
    });
  });

  it("falls back to the first tenant when no Lightspeed-specific tenant match exists", async () => {
    const noMatchChain = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn(),
    };
    noMatchChain.select.mockReturnValue(noMatchChain);
    noMatchChain.eq.mockReturnValue(noMatchChain);
    noMatchChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const tenantsChain = {
      select: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn(),
    };
    tenantsChain.select.mockReturnValue(tenantsChain);
    tenantsChain.order.mockReturnValue(tenantsChain);
    tenantsChain.limit.mockReturnValue(tenantsChain);
    tenantsChain.maybeSingle.mockResolvedValue({
      data: { id: "tenant-default" },
      error: null,
    });

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "tenant_lightspeed_settings") {
          return noMatchChain;
        }

        if (table === "tenants") {
          return tenantsChain;
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const repo = new LightspeedSettingsRepository(supabase as never);

    await expect(
      repo.findTenantIdByRetailerOrDomainPrefix({
        retailerId: "retailer-1",
        domainPrefix: "demo-store",
      }),
    ).resolves.toBe("tenant-default");
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
