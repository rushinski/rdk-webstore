import { ProductTitleParserService } from "@/services/product-title-parser-service";

const mockListBrandsWithGroups = jest.fn();
const mockListBrandAliases = jest.fn();
const mockListModels = jest.fn();
const mockListModelAliasesAll = jest.fn();

jest.mock("@/repositories/catalog-repo", () => ({
  CatalogRepository: jest.fn().mockImplementation(() => ({
    listBrandsWithGroups: mockListBrandsWithGroups,
    listBrandAliases: mockListBrandAliases,
    listModels: mockListModels,
    listModelAliasesAll: mockListModelAliasesAll,
  })),
}));

describe("ProductTitleParserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockListBrandsWithGroups.mockResolvedValue([
      {
        id: "brand-nike",
        canonical_label: "Nike",
        group: { id: "group-1", key: "nike", label: "Nike" },
      },
    ]);
    mockListBrandAliases.mockResolvedValue([]);
    mockListModels.mockResolvedValue([
      {
        id: "model-jordan-3",
        canonical_label: "Jordan 3",
        brand_id: "brand-nike",
      },
    ]);
    mockListModelAliasesAll.mockResolvedValue([]);
  });

  it("reuses catalog lookups across multiple parses for the same tenant", async () => {
    const service = new ProductTitleParserService({} as never);

    await service.parseTitle({
      titleRaw: "Nike Jordan 3 White Cement",
      category: "sneakers",
      tenantId: "tenant-1",
    });
    await service.parseTitle({
      titleRaw: "Nike Jordan 3 Black Cement",
      category: "sneakers",
      tenantId: "tenant-1",
    });

    expect(mockListBrandsWithGroups).toHaveBeenCalledTimes(1);
    expect(mockListBrandAliases).toHaveBeenCalledTimes(1);
    expect(mockListModels).toHaveBeenCalledTimes(1);
    expect(mockListModelAliasesAll).toHaveBeenCalledTimes(1);
  });
});
