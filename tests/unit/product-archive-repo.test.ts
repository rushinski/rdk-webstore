import { ProductRepository } from "@/repositories/product-repo";

type QueryChain = {
  select: jest.Mock;
  eq: jest.Mock;
  is: jest.Mock;
  not: jest.Mock;
  lte: jest.Mock;
  gt: jest.Mock;
  or: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  limit: jest.Mock;
  maybeSingle: jest.Mock;
  update: jest.Mock;
};

function createQueryChain(result: {
  data: unknown;
  error: unknown;
  count?: number | null;
}) {
  const chain: QueryChain = {
    select: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    not: jest.fn(),
    lte: jest.fn(),
    gt: jest.fn(),
    or: jest.fn(),
    in: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    limit: jest.fn(),
    maybeSingle: jest.fn(),
    update: jest.fn(),
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.not.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
  chain.gt.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.range.mockResolvedValue(result);
  chain.limit.mockResolvedValue(result);
  chain.maybeSingle.mockResolvedValue(result);
  chain.update.mockReturnValue(chain);

  return chain;
}

describe("ProductRepository archive behavior", () => {
  it("excludes archived products from inventory lists by default", async () => {
    const baseQuery = createQueryChain({ data: [], error: null, count: 0 });
    const supabase = {
      from: jest.fn(() => baseQuery),
    };

    const repo = new ProductRepository(supabase as never);

    const result = await repo.list({
      tenantId: "tenant-1",
      searchMode: "inventory",
      stockStatus: "in_stock",
      includeOutOfStock: true,
    });

    expect(baseQuery.is).toHaveBeenCalledWith("archived_at", null);
    expect(result).toEqual({
      products: [],
      total: 0,
      skuTotal: 0,
      inventoryUnitTotal: 0,
      page: 1,
      limit: 20,
    });
  });

  it("returns only archived products when requested", async () => {
    const baseQuery = createQueryChain({ data: [], error: null, count: 0 });
    const supabase = {
      from: jest.fn(() => baseQuery),
    };

    const repo = new ProductRepository(supabase as never);

    await repo.list({
      tenantId: "tenant-1",
      searchMode: "inventory",
      archivedStatus: "archived",
      includeOutOfStock: true,
    });

    expect(baseQuery.not).toHaveBeenCalledWith("archived_at", "is", null);
  });

  it("counts matching inventory as distinct SKUs instead of product rows", async () => {
    const productIdQuery = createQueryChain({
      data: [{ id: "product-1" }, { id: "product-2" }],
      error: null,
      count: 2,
    });
    const detailQuery = createQueryChain({
      data: [
        {
          id: "product-1",
          variants: [
            { id: "variant-1", sku: "SKU-1" },
            { id: "variant-2", sku: "SKU-2" },
          ],
          images: [],
          tags: [],
        },
        {
          id: "product-2",
          variants: [
            { id: "variant-3", sku: "SKU-3" },
            { id: "variant-4", sku: "SKU-4" },
            { id: "variant-5", sku: "SKU-5" },
          ],
          images: [],
          tags: [],
        },
      ],
      error: null,
    });
    const skuQuery = createQueryChain({
      data: [
        { sku: "SKU-1", product: { archived_at: null, is_active: true } },
        { sku: "SKU-2", product: { archived_at: null, is_active: true } },
        { sku: "SKU-3", product: { archived_at: null, is_active: true } },
        { sku: "SKU-4", product: { archived_at: null, is_active: true } },
        { sku: "SKU-5", product: { archived_at: null, is_active: true } },
      ],
      error: null,
      count: 5,
    });
    const inventoryUnitsQuery = createQueryChain({
      data: [
        { stock: 2, product: { archived_at: null, is_active: true } },
        { stock: 3, product: { archived_at: null, is_active: true } },
        { stock: 1, product: { archived_at: null, is_active: true } },
        { stock: 0, product: { archived_at: null, is_active: true } },
        { stock: 4, product: { archived_at: null, is_active: true } },
      ],
      error: null,
      count: 5,
    });
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "product_variants") {
          if (skuQuery.select.mock.calls.length === 0) {
            return skuQuery;
          }
          return inventoryUnitsQuery;
        }
        if (table === "products") {
          if (productIdQuery.select.mock.calls.length === 0) {
            return productIdQuery;
          }
          return detailQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const repo = new ProductRepository(supabase as never);

    const result = await repo.list({
      tenantId: "tenant-1",
      searchMode: "inventory",
      stockStatus: "in_stock",
      includeOutOfStock: true,
    });

    expect(result.total).toBe(2);
    expect(result.skuTotal).toBe(5);
    expect(result.inventoryUnitTotal).toBe(10);
  });

  it("keeps zero-stock non-archived products in the main admin inventory view", async () => {
    const productIdQuery = createQueryChain({
      data: [{ id: "product-1" }, { id: "product-2" }],
      error: null,
      count: 2,
    });
    const detailQuery = createQueryChain({
      data: [
        {
          id: "product-1",
          archived_at: null,
          is_out_of_stock: false,
          variants: [{ id: "variant-1", sku: "SKU-1", stock: 2 }],
          images: [],
          tags: [],
        },
        {
          id: "product-2",
          archived_at: null,
          is_out_of_stock: true,
          variants: [{ id: "variant-2", sku: "SKU-2", stock: 0 }],
          images: [],
          tags: [],
        },
      ],
      error: null,
    });
    const skuQuery = createQueryChain({
      data: [
        { sku: "SKU-1", stock: 2, product: { archived_at: null, is_active: true } },
        { sku: "SKU-2", stock: 0, product: { archived_at: null, is_active: true } },
      ],
      error: null,
      count: 2,
    });
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "product_variants") {
          return skuQuery;
        }
        if (table === "products") {
          if (productIdQuery.select.mock.calls.length === 0) {
            return productIdQuery;
          }
          return detailQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const repo = new ProductRepository(supabase as never);

    await repo.list({
      tenantId: "tenant-1",
      searchMode: "inventory",
      stockStatus: "in_stock",
      includeOutOfStock: true,
    });

    expect(productIdQuery.eq).not.toHaveBeenCalledWith("is_out_of_stock", false);
    expect(detailQuery.eq).not.toHaveBeenCalledWith("is_out_of_stock", false);
  });

  it("archives and restores products with archived_at writes", async () => {
    const updateChain = createQueryChain({ data: null, error: null });
    const supabase = {
      from: jest.fn(() => updateChain),
    };

    const repo = new ProductRepository(supabase as never);

    await repo.archive("product-1");
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        archived_at: expect.any(String),
        is_out_of_stock: true,
      }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith("id", "product-1");

    updateChain.update.mockClear();
    updateChain.eq.mockClear();

    await repo.restore("product-1");
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ archived_at: null }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith("id", "product-1");
  });

  it("restores large product sets in batches", async () => {
    const firstBatch = createQueryChain({ data: null, error: null });
    const secondBatch = createQueryChain({ data: null, error: null });
    firstBatch.select.mockResolvedValue({
      data: Array.from({ length: 100 }, (_, index) => ({ id: `first-${index}` })),
      error: null,
    });
    secondBatch.select.mockResolvedValue({
      data: [{ id: "last-1" }],
      error: null,
    });
    const supabase = {
      from: jest.fn().mockReturnValueOnce(firstBatch).mockReturnValueOnce(secondBatch),
    };

    const repo = new ProductRepository(supabase as never);
    const ids = [
      ...Array.from({ length: 100 }, (_, index) => `first-${index}`),
      "last-1",
    ];

    const count = await repo.restoreMany(ids);

    expect(firstBatch.in).toHaveBeenCalledWith("id", ids.slice(0, 100));
    expect(secondBatch.in).toHaveBeenCalledWith("id", ["last-1"]);
    expect(count).toBe(101);
  });

  it("archives large product sets in batches", async () => {
    const firstBatch = createQueryChain({ data: null, error: null });
    const secondBatch = createQueryChain({ data: null, error: null });
    firstBatch.select.mockResolvedValue({
      data: Array.from({ length: 100 }, (_, index) => ({ id: `first-${index}` })),
      error: null,
    });
    secondBatch.select.mockResolvedValue({
      data: [{ id: "last-1" }],
      error: null,
    });
    const supabase = {
      from: jest.fn().mockReturnValueOnce(firstBatch).mockReturnValueOnce(secondBatch),
    };

    const repo = new ProductRepository(supabase as never);
    const ids = [
      ...Array.from({ length: 100 }, (_, index) => `first-${index}`),
      "last-1",
    ];

    const count = await repo.archiveMany(ids);

    expect(firstBatch.in).toHaveBeenCalledWith("id", ids.slice(0, 100));
    expect(secondBatch.in).toHaveBeenCalledWith("id", ["last-1"]);
    expect(count).toBe(101);
  });
});
