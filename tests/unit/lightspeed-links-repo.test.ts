import { LightspeedLinksRepository } from "@/repositories/lightspeed-links-repo";

type QueryResult = {
  data: unknown;
  error: unknown;
};

function createUpdateChain(result: QueryResult) {
  return {
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
}

function createUpsertChain(result: QueryResult) {
  return {
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
}

describe("LightspeedLinksRepository", () => {
  it("paginates tenant links beyond the first 1000 rows", async () => {
    const pageOne = Array.from({ length: 1000 }, (_, index) => ({
      id: `link-${index + 1}`,
      tenant_id: "tenant-1",
      product_id: `product-${index + 1}`,
      variant_id: `variant-${index + 1}`,
      external_sku: `SKU-${index + 1}`,
      sync_state: "linked",
    }));
    const pageTwo = [
      {
        id: "link-1001",
        tenant_id: "tenant-1",
        product_id: "product-1001",
        variant_id: "variant-1001",
        external_sku: "SKU-1001",
        sync_state: "linked",
      },
    ];
    const range = jest
      .fn()
      .mockResolvedValueOnce({ data: pageOne, error: null })
      .mockResolvedValueOnce({ data: pageTwo, error: null });
    const eq = jest.fn();
    const select = jest.fn().mockReturnValue({ eq, range });
    eq.mockReturnValue({ range });
    const supabase = {
      from: jest.fn().mockReturnValue({ select }),
    };

    const repository = new LightspeedLinksRepository(supabase as never);
    const result = await repository.listByTenant("tenant-1");

    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(result).toHaveLength(1001);
  });

  it("retries upsert without last_error when the column is missing from schema cache", async () => {
    const successfulRow = {
      id: "link-1",
      tenant_id: "tenant-1",
      product_id: "product-1",
      variant_id: "variant-1",
      external_sku: "SKU-1",
      sync_state: "linked",
    };
    const upsertSpy = jest
      .fn()
      .mockReturnValueOnce(
        createUpsertChain({
          data: null,
          error: {
            code: "PGRST204",
            message:
              "Could not find the 'last_error' column of 'lightspeed_product_links' in the schema cache",
          },
        }),
      )
      .mockReturnValueOnce(
        createUpsertChain({
          data: successfulRow,
          error: null,
        }),
      );
    const supabase = {
      from: jest.fn().mockReturnValue({
        upsert: upsertSpy,
      }),
    };
    const repository = new LightspeedLinksRepository(supabase as never);

    const result = await repository.upsertLink({
      tenantId: "tenant-1",
      productId: "product-1",
      variantId: "variant-1",
      externalSku: "SKU-1",
      syncState: "linked",
      lastError: null,
    });

    expect(upsertSpy).toHaveBeenCalledTimes(2);
    expect(upsertSpy.mock.calls[0]?.[0]).toMatchObject({
      last_error: null,
    });
    expect(upsertSpy.mock.calls[1]?.[0]).not.toHaveProperty("last_error");
    expect(result).toEqual(successfulRow);
  });

  it("retries update without last_error when the column is missing from schema cache", async () => {
    const successfulRow = {
      id: "link-1",
      tenant_id: "tenant-1",
      product_id: "product-1",
      variant_id: "variant-1",
      external_sku: "SKU-1",
      sync_state: "deleted",
    };
    const updateSpy = jest
      .fn()
      .mockReturnValueOnce(
        createUpdateChain({
          data: null,
          error: {
            code: "PGRST204",
            message:
              "Could not find the 'last_error' column of 'lightspeed_product_links' in the schema cache",
          },
        }),
      )
      .mockReturnValueOnce(
        createUpdateChain({
          data: successfulRow,
          error: null,
        }),
      );
    const supabase = {
      from: jest.fn().mockReturnValue({
        update: updateSpy,
      }),
    };
    const repository = new LightspeedLinksRepository(supabase as never);

    const result = await repository.updateLinkById("link-1", {
      syncState: "deleted",
      lastError: null,
    });

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy.mock.calls[0]?.[0]).toMatchObject({
      last_error: null,
    });
    expect(updateSpy.mock.calls[1]?.[0]).not.toHaveProperty("last_error");
    expect(result).toEqual(successfulRow);
  });
});
