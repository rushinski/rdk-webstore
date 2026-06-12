import { ProductRepository } from "@/repositories/product-repo";

describe("ProductRepository.listForReconciliation", () => {
  it("includes non-archived inactive products so reconciliation can see prior imports", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const chain = {
      eq: jest.fn(),
      is: jest.fn(),
      not: jest.fn(),
      order,
    };
    chain.eq.mockReturnValue(chain);
    chain.is.mockReturnValue(chain);
    chain.not.mockReturnValue(chain);
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
});
