import {
  extractDeletedProductRecord,
  formatDeletedProductRecordsAsCsv,
} from "@/lib/lightspeed/audit-recovery";

describe("lightspeed audit recovery helpers", () => {
  it("prefers old_data fields when extracting a deleted product record", () => {
    const result = extractDeletedProductRecord({
      id: "event-1",
      entity_id: "product-1",
      action: "delete",
      type: "vend_product",
      occurred_at: "2026-06-12T14:00:00Z",
      created_at: "2026-06-12T14:00:01Z",
      data: {
        name: "Replacement Name",
        sku: "NEW-SKU",
      },
      old_data: {
        name: "Deleted Product",
        sku: "OLD-SKU",
        variant_name: "10",
        handle: "deleted-product",
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        eventId: "event-1",
        entityId: "product-1",
        action: "delete",
        type: "vend_product",
        occurredAt: "2026-06-12T14:00:00Z",
        name: "Deleted Product",
        sku: "OLD-SKU",
        variantName: "10",
        handle: "deleted-product",
      }),
    );
  });

  it("falls back to array payload objects when audit data is wrapped", () => {
    const result = extractDeletedProductRecord({
      id: "event-2",
      entity_id: "product-2",
      action: "delete",
      type: "vend_product",
      occurred_at: "2026-06-12T14:05:00Z",
      created_at: "2026-06-12T14:05:01Z",
      data: [
        {
          name: "Array Product",
          sku: "ARRAY-001",
          variant_name: "OS",
        },
      ],
      old_data: {},
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: "Array Product",
        sku: "ARRAY-001",
        variantName: "OS",
      }),
    );
  });

  it("formats extracted records as csv with escaped values", () => {
    const csv = formatDeletedProductRecordsAsCsv([
      {
        eventId: "event-3",
        entityId: "product-3",
        action: "delete",
        type: "vend_product",
        occurredAt: "2026-06-12T15:00:00Z",
        createdAt: "2026-06-12T15:00:01Z",
        userId: null,
        ipAddress: null,
        userAgent: null,
        name: 'Jordan 3 "Fire Red"',
        sku: "J3-001",
        variantName: "9M / 10.5W",
        handle: null,
        source: null,
        rawData: { name: 'Jordan 3 "Fire Red"' },
        rawOldData: { sku: "J3-001" },
      },
    ]);

    expect(csv).toContain(
      '"event-3","product-3","delete","vend_product","2026-06-12T15:00:00Z"',
    );
    expect(csv).toContain('"Jordan 3 ""Fire Red"""');
    expect(csv).toContain('"J3-001"');
  });
});
