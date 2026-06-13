const insertMock = jest.fn();
const selectMock = jest.fn();
const singleMock = jest.fn();
const fromMock = jest.fn();

jest.mock("@/lib/supabase/server", () => ({}));

import { DeletedProductRecoveryRepository } from "@/repositories/deleted-product-recovery-repo";

describe("DeletedProductRecoveryRepository", () => {
  beforeEach(() => {
    insertMock.mockReset();
    selectMock.mockReset();
    singleMock.mockReset();
    fromMock.mockReset();
  });

  it("rethrows insert errors from deleted_product_recovery", async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: Object.assign(new Error("new row violates row-level security policy"), {
        code: "42501",
      }),
    });
    selectMock.mockReturnValue({ single: singleMock });
    insertMock.mockReturnValue({ select: selectMock });
    fromMock.mockReturnValue({ insert: insertMock });

    const repo = new DeletedProductRecoveryRepository(
      {} as never,
      {
        from: fromMock,
      } as never,
    );

    await expect(
      repo.recordDeletion({
        tenantId: "tenant-1",
        productId: "product-1",
        localProductSnapshot: {},
        lightspeedProductSnapshots: [],
        links: [],
      }),
    ).rejects.toThrow("new row violates row-level security policy");
  });
});
