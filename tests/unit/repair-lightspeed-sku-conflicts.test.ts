import {
  extractSkusFromText,
  parseArgs,
  planRepair,
  type RepairInspection,
} from "@/../scripts/repair-lightspeed-sku-conflicts";

describe("repair-lightspeed-sku-conflicts", () => {
  it("extracts sku lines from pasted conflict text", () => {
    expect(
      extractSkusFromText(`
JORDAN 5
Restore
SKU: 11979
duplicate key value violates unique constraint

Another Product
Edit
SKU: N-JDN-J05-5H-05
`),
    ).toEqual(["11979", "N-JDN-J05-5H-05"]);
  });

  it("parses file/apply/json args", () => {
    expect(
      parseArgs(["--file", "tmp/conflicts.txt", "--sku", "11979", "--apply", "--json"]),
    ).toEqual({
      tenantId: null,
      filePath: "tmp/conflicts.txt",
      skus: ["11979"],
      apply: true,
      json: true,
    });
  });

  it("plans a move from an archived orphan to a linked target", () => {
    const inspection: RepairInspection = {
      sku: "11269",
      products: [
        {
          id: "source-product",
          name: "JORDAN 4",
          brand: "Air Jordan",
          category: "sneakers",
          condition: "used",
          isActive: true,
          isOutOfStock: false,
          archivedAt: "2026-06-13T09:55:19.727Z",
          goLiveAt: "2026-06-07T21:00:00.000Z",
          variants: [
            {
              id: "source-variant",
              sku: "11269",
              sizeLabel: "11M / 12.5W",
              stock: 1,
              sortOrder: 0,
            },
          ],
          links: [],
        },
        {
          id: "target-product",
          name: "JORDAN 4",
          brand: "Air Jordan",
          category: "sneakers",
          condition: "used",
          isActive: true,
          isOutOfStock: true,
          archivedAt: null,
          goLiveAt: "2026-06-07T21:00:00.000Z",
          variants: [
            {
              id: "target-variant",
              sku: "11285",
              sizeLabel: "8.5M / 10W",
              stock: 1,
              sortOrder: 0,
            },
          ],
          links: [
            {
              id: "link-1",
              externalSku: "11285",
              syncState: "linked",
              lightspeedProductId: "ls-family-1",
              lightspeedVariantId: "ls-variant-1",
              tombstonedAt: null,
              lastError: null,
            },
          ],
        },
      ],
    };

    expect(planRepair(inspection)).toEqual({
      sku: "11269",
      status: "ready_to_move",
      reason: "single_archived_orphan_to_single_linked_target",
      sourceProductId: "source-product",
      sourceVariantId: "source-variant",
      targetProductId: "target-product",
      targetSortOrder: 1,
    });
  });

  it("skips when more than one linked target matches", () => {
    const inspection: RepairInspection = {
      sku: "11269",
      products: [
        {
          id: "source-product",
          name: "JORDAN 4",
          brand: "Air Jordan",
          category: "sneakers",
          condition: "used",
          isActive: true,
          isOutOfStock: false,
          archivedAt: "2026-06-13T09:55:19.727Z",
          goLiveAt: "2026-06-07T21:00:00.000Z",
          variants: [
            {
              id: "source-variant",
              sku: "11269",
              sizeLabel: "11M / 12.5W",
              stock: 1,
              sortOrder: 0,
            },
          ],
          links: [],
        },
        {
          id: "target-product-1",
          name: "JORDAN 4",
          brand: "Air Jordan",
          category: "sneakers",
          condition: "used",
          isActive: true,
          isOutOfStock: false,
          archivedAt: null,
          goLiveAt: null,
          variants: [],
          links: [
            {
              id: "link-1",
              externalSku: "11285",
              syncState: "linked",
              lightspeedProductId: "ls-family-1",
              lightspeedVariantId: "ls-variant-1",
              tombstonedAt: null,
              lastError: null,
            },
          ],
        },
        {
          id: "target-product-2",
          name: "JORDAN 4",
          brand: "Air Jordan",
          category: "sneakers",
          condition: "used",
          isActive: true,
          isOutOfStock: false,
          archivedAt: null,
          goLiveAt: null,
          variants: [],
          links: [
            {
              id: "link-2",
              externalSku: "11286",
              syncState: "linked",
              lightspeedProductId: "ls-family-2",
              lightspeedVariantId: "ls-variant-2",
              tombstonedAt: null,
              lastError: null,
            },
          ],
        },
      ],
    };

    expect(planRepair(inspection)).toEqual({
      sku: "11269",
      status: "skipped",
      reason: "multiple_linked_targets",
    });
  });

  it("falls back to a single linked target with matching name brand and category when condition differs", () => {
    const inspection: RepairInspection = {
      sku: "11269",
      products: [
        {
          id: "source-product",
          name: "JORDAN 4",
          brand: "Air Jordan",
          category: "sneakers",
          condition: "used",
          isActive: true,
          isOutOfStock: false,
          archivedAt: "2026-06-13T09:55:19.727Z",
          goLiveAt: "2026-06-07T21:00:00.000Z",
          variants: [
            {
              id: "source-variant",
              sku: "11269",
              sizeLabel: "11M / 12.5W",
              stock: 1,
              sortOrder: 0,
            },
          ],
          links: [],
        },
        {
          id: "target-product",
          name: "JORDAN 4",
          brand: "Air Jordan",
          category: "sneakers",
          condition: "new",
          isActive: true,
          isOutOfStock: false,
          archivedAt: null,
          goLiveAt: null,
          variants: [],
          links: [
            {
              id: "link-1",
              externalSku: "11285",
              syncState: "linked",
              lightspeedProductId: "ls-family-1",
              lightspeedVariantId: "ls-variant-1",
              tombstonedAt: null,
              lastError: null,
            },
          ],
        },
      ],
    };

    expect(planRepair(inspection)).toEqual({
      sku: "11269",
      status: "ready_to_move",
      reason: "single_archived_orphan_to_single_linked_target",
      sourceProductId: "source-product",
      sourceVariantId: "source-variant",
      targetProductId: "target-product",
      targetSortOrder: 0,
    });
  });
});
