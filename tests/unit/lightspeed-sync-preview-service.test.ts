import { LightspeedSyncPreviewService } from "@/services/lightspeed-sync-preview-service";

describe("LightspeedSyncPreviewService", () => {
  it("groups proposed changes by change type and persists the preview run", async () => {
    const createRun = jest.fn().mockResolvedValue({ id: "run-1" });
    const createItems = jest.fn().mockResolvedValue([
      {
        id: "item-1",
        change_type: "added",
        entity_key: "P-ADI-YDB-06-02",
        action: "create_website_product",
      },
      {
        id: "item-2",
        change_type: "modified",
        entity_key: "variant-2",
        action: "update_website_inventory",
      },
      {
        id: "item-3",
        change_type: "added",
        entity_key: "product-3",
        action: "create_lightspeed_product",
      },
    ]);

    const service = new LightspeedSyncPreviewService(
      {
        list: jest.fn().mockResolvedValue({
          products: [
            {
              id: "product-1",
              sku: "N-JDN-J03-BH-01",
              title_raw: "A MA MANIERE JORDAN 3",
              title_display: "A MA MANIERE JORDAN 3",
              condition: "new",
              brand: "Jordan",
              name: "A MA MANIERE JORDAN 3",
              is_active: true,
              is_out_of_stock: false,
              go_live_at: null,
              variants: [
                {
                  id: "variant-1",
                  size_label: "11.5M / 13W",
                  stock: 1,
                  price_cents: 22000,
                },
              ],
              images: [],
              tags: [],
            },
            {
              id: "product-2",
              sku: "P-JDN-J05-9H-27",
              title_raw: "A MA MANIERE JORDAN 5",
              title_display: "A MA MANIERE JORDAN 5",
              condition: "used",
              brand: "Jordan",
              name: "A MA MANIERE JORDAN 5",
              is_active: true,
              is_out_of_stock: false,
              go_live_at: null,
              variants: [
                {
                  id: "variant-2",
                  size_label: "9.5M / 11W",
                  stock: 0,
                  price_cents: 10000,
                },
              ],
              images: [],
              tags: [],
            },
            {
              id: "product-3",
              sku: "N-OTH-CLT-MD-30",
              title_raw: "Abominable Black/White Track Suit",
              title_display: "Abominable Black/White Track Suit",
              condition: "new",
              brand: "Other",
              name: "Abominable Black/White Track Suit",
              is_active: true,
              is_out_of_stock: false,
              go_live_at: null,
              variants: [
                {
                  id: "variant-3",
                  size_label: "MEDIUM",
                  stock: 1,
                  price_cents: 25000,
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
            external_sku: "P-JDN-J05-9H-27",
            sync_state: "linked",
          },
        ]),
      } as never,
      {
        createRun,
        createItems,
      } as never,
      {
        listProducts: jest.fn().mockResolvedValue([
          {
            id: "ls-product-1",
            name: "A MA MANIERE JORDAN 3 - N-JDN-J03-BH-01",
            description: "",
            sku: "N-JDN-J03-BH-01",
            brand_name: "Jordan",
            product_category: "Sneakers",
            active: true,
            deleted_at: null,
            variant_option_one_name: "Condition",
            variant_option_one_value: "new",
            variant_option_two_name: "Size",
            variant_option_two_value: "11.5M / 13W",
            inventory_Main_Outlet: 1,
          },
          {
            id: "ls-product-2",
            name: "A MA MANIERE JORDAN 5 - P-JDN-J05-9H-27",
            description: "<p>OG BOX 11W / 9.5M</p>",
            sku: "P-JDN-J05-9H-27",
            brand_name: "Jordan",
            product_category: "Sneakers",
            active: true,
            deleted_at: null,
            variant_option_one_name: "Condition",
            variant_option_one_value: "preowned",
            variant_option_two_name: "Size",
            variant_option_two_value: "9.5M / 11W",
            inventory_Main_Outlet: 1,
          },
          {
            id: "ls-product-3",
            name: "ADIDAD YEEZY DESERT BOOT OIL - P-ADI-YDB-06-02",
            description: "REPLACEMENT BOX",
            sku: "P-ADI-YDB-06-02",
            brand_name: "Adidas",
            product_category: "Sneakers",
            active: true,
            deleted_at: null,
            variant_option_one_name: "Condition",
            variant_option_one_value: "preowned",
            variant_option_two_name: "Size",
            variant_option_two_value: "6Y / 7.5W",
            inventory_Main_Outlet: 1,
          },
        ]),
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
        added: 2,
        modified: 1,
        archived: 0,
        conflicts: 0,
        skipped: 0,
      },
    });

    expect(createItems).toHaveBeenCalledWith(
      "run-1",
      expect.arrayContaining([
        expect.objectContaining({
          changeType: "added",
          entityKey: "P-ADI-YDB-06-02",
        }),
      ]),
    );

    expect(preview.summary).toEqual({
      added: 2,
      modified: 1,
      archived: 0,
      conflicts: 0,
      skipped: 0,
    });
    expect(preview.groups.added).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "create_website_product",
          entityKey: "P-ADI-YDB-06-02",
          payload: expect.objectContaining({
            cleanName: "ADIDAD YEEZY DESERT BOOT OIL",
            condition: "used",
            sizeLabel: "6Y / 7.5W",
          }),
        }),
        expect.objectContaining({
          action: "create_lightspeed_product",
          entityKey: "product-3",
        }),
      ]),
    );
    expect(preview.groups.modified).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "update_website_inventory",
          entityKey: "variant-2",
          payload: expect.objectContaining({
            websiteStock: 0,
            lightspeedStock: 1,
          }),
        }),
      ]),
    );
  });
});
