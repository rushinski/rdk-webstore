import { ProductRepository } from "@/repositories/product-repo";

describe("ProductRepository.listForReconciliation", () => {
  it("includes non-archived inactive products so reconciliation can see prior imports", async () => {
    const range = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const chain = {
      eq: jest.fn(),
      is: jest.fn(),
      not: jest.fn(),
      order: jest.fn(),
      range,
    };
    chain.eq.mockReturnValue(chain);
    chain.is.mockReturnValue(chain);
    chain.not.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    const select = jest.fn().mockReturnValue(chain);
    const from = jest.fn().mockReturnValue({
      select,
    });

    const repository = new ProductRepository({ from } as never);

    await repository.listForReconciliation("tenant-1", "active");

    expect(chain.eq).toHaveBeenCalledWith("tenant_id", "tenant-1");
    expect(chain.eq).not.toHaveBeenCalledWith("is_active", true);
    expect(chain.is).toHaveBeenCalledWith("archived_at", null);
  });

  it("paginates reconciliation products beyond the first 1000 rows", async () => {
    const pageOne = Array.from({ length: 1000 }, (_, index) => ({
      id: `product-${index + 1}`,
      variants: [],
      images: [],
      tags: [],
    }));
    const pageTwo = [
      {
        id: "product-1001",
        variants: [],
        images: [],
        tags: [],
      },
    ];
    const range = jest
      .fn()
      .mockResolvedValueOnce({ data: pageOne, error: null })
      .mockResolvedValueOnce({ data: pageTwo, error: null });
    const chain = {
      eq: jest.fn(),
      is: jest.fn(),
      not: jest.fn(),
      order: jest.fn(),
      range,
    };
    chain.eq.mockReturnValue(chain);
    chain.is.mockReturnValue(chain);
    chain.not.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    const select = jest.fn().mockReturnValue(chain);
    const from = jest.fn().mockReturnValue({ select });

    const repository = new ProductRepository({ from } as never);

    const result = await repository.listForReconciliation("tenant-1", "active");

    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(result).toHaveLength(1001);
  });
});
