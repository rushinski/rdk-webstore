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
