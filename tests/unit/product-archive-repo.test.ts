import { ProductRepository } from "@/repositories/product-repo";

type QueryChain = {
  select: jest.Mock;
  eq: jest.Mock;
  is: jest.Mock;
  not: jest.Mock;
  lte: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  maybeSingle: jest.Mock;
  update: jest.Mock;
};

function createQueryChain(result: { data: unknown; error: unknown; count?: number | null }) {
  const chain: QueryChain = {
    select: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    not: jest.fn(),
    lte: jest.fn(),
    in: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    maybeSingle: jest.fn(),
    update: jest.fn(),
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.not.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.range.mockResolvedValue(result);
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
    expect(result).toEqual({ products: [], total: 0, page: 1, limit: 20 });
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
    expect(updateChain.update).toHaveBeenCalledWith({ archived_at: null });
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
      from: jest
        .fn()
        .mockReturnValueOnce(firstBatch)
        .mockReturnValueOnce(secondBatch),
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
      from: jest
        .fn()
        .mockReturnValueOnce(firstBatch)
        .mockReturnValueOnce(secondBatch),
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
