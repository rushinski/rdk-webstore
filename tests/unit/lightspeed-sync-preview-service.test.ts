import { LightspeedSyncPreviewService } from "@/services/lightspeed-sync-preview-service";

describe("LightspeedSyncPreviewService", () => {
  it("groups proposed changes by change type and persists the preview run", async () => {
    const createRun = jest.fn().mockResolvedValue({ id: "run-1" });
    const createItems = jest.fn().mockResolvedValue([
      {
        id: "item-1",
        change_type: "added",
        entity_key: "product-1",
        action: "create_lightspeed_product",
      },
      {
        id: "item-2",
        change_type: "conflicts",
        entity_key: "P-NIK-J4D-09-02",
        action: "resolve_duplicate_link",
      },
      {
        id: "item-3",
        change_type: "archived",
        entity_key: "product-x",
        action: "archive_lightspeed_product",
      },
    ]);

    const service = new LightspeedSyncPreviewService(
      {
        list: jest.fn().mockResolvedValue({
          products: [
            {
              id: "product-1",
              sku: "N-NIK-J4D-09-01",
              title_raw: "Jordan 4 Delta",
              title_display: "Jordan 4 Delta",
              condition: "new",
              brand: "Nike",
              name: "Jordan 4 Delta",
              is_active: true,
              is_out_of_stock: false,
              go_live_at: null,
              variants: [
                {
                  id: "variant-1",
                  size_label: "9",
                  stock: 1,
                  price_cents: 25000,
                },
              ],
              images: [],
              tags: [],
            },
            {
              id: "product-2",
              sku: "P-NIK-J4D-09-02",
              title_raw: "Jordan 4 Delta",
              title_display: "Jordan 4 Delta",
              condition: "used",
              brand: "Nike",
              name: "Jordan 4 Delta",
              is_active: true,
              is_out_of_stock: false,
              go_live_at: null,
              variants: [
                {
                  id: "variant-2",
                  size_label: "9",
                  stock: 1,
                  price_cents: 18000,
                },
              ],
              images: [],
              tags: [],
            },
          ],
        }),
      } as never,
      {
        listByTenant: jest.fn().mockResolvedValue([
          {
            id: "link-1",
            tenant_id: "tenant-1",
            product_id: "product-2",
            variant_id: "variant-2",
            lightspeed_product_id: "ls-product-2",
            lightspeed_variant_id: null,
            lightspeed_inventory_item_id: null,
            external_sku: "P-NIK-J4D-09-02",
            sync_state: "linked",
          },
          {
            id: "link-2",
            tenant_id: "tenant-1",
            product_id: "product-x",
            variant_id: "variant-x",
            lightspeed_product_id: "ls-product-x",
            lightspeed_variant_id: null,
            lightspeed_inventory_item_id: null,
            external_sku: "P-NIK-J4D-09-02",
            sync_state: "linked",
          },
        ]),
      } as never,
      {
        createRun,
        createItems,
      } as never,
    );

    const preview = await service.previewSync({
      tenantId: "tenant-1",
      startedBy: "user-1",
      sourceOfTruth: "lightspeed_inventory",
    });

    expect(createRun).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      startedBy: "user-1",
      sourceOfTruth: "lightspeed_inventory",
      status: "preview",
      summary: {
        added: 1,
        modified: 0,
        archived: 1,
        conflicts: 1,
        skipped: 0,
      },
    });

    expect(createItems).toHaveBeenCalledWith(
      "run-1",
      expect.arrayContaining([
        expect.objectContaining({
          changeType: "added",
          entityKey: "product-1",
        }),
        expect.objectContaining({
          changeType: "conflicts",
          entityKey: "P-NIK-J4D-09-02",
        }),
      ]),
    );

    expect(preview.summary).toEqual({
      added: 1,
      modified: 0,
      archived: 1,
      conflicts: 1,
      skipped: 0,
    });
    expect(preview.groups.added).toHaveLength(1);
    expect(preview.groups.archived).toHaveLength(1);
    expect(preview.groups.conflicts).toHaveLength(1);
  });
});
