import { LightspeedMappingService } from "@/services/lightspeed-mapping-service";
import { LightspeedSkuService } from "@/services/lightspeed-sku-service";

describe("LightspeedSkuService", () => {
  it("builds a formatted SKU with a padded sequence", () => {
    const service = new LightspeedSkuService();

    expect(
      service.buildSku({
        conditionCode: "N",
        brandCode: "NIK",
        modelCode: "J4R",
        sizeCode: "09",
        sequence: 1,
      }),
    ).toBe("N-NIK-J4R-09-01");
  });
});

describe("LightspeedMappingService", () => {
  const service = new LightspeedMappingService();

  it("maps used website condition to preowned for Lightspeed", () => {
    expect(service.toLightspeedCondition("used")).toBe("preowned");
    expect(service.toWebsiteCondition("preowned")).toBe("used");
  });

  it("prefers a CUSTOM product code when the remote SKU is missing", () => {
    expect(
      service.extractExternalSku({
        id: "ls-product-3",
        sku: null,
        product_codes: [
          { type: "EAN", code: "ignored-code" },
          { type: "CUSTOM", code: "N-JDN-J03-BH-01" },
        ],
      }),
    ).toBe("N-JDN-J03-BH-01");
  });

  it("builds Lightspeed variant definitions with attribute ids", () => {
    expect(
      service.buildVariantDefinitions([
        {
          attributeId: "size-attribute-id",
          name: "Size",
          value: "11.5M / 13W",
        },
      ]),
    ).toEqual([{ attribute_id: "size-attribute-id", value: "11.5M / 13W" }]);
  });

  it("uses MV when multiple size labels exist", () => {
    expect(service.toRepresentativeSizeCode(["9", "10"])).toBe("MV");
  });

  it("adds SKU to unique-unit Lightspeed names and strips it for website names", () => {
    const lightspeedName = service.buildLightspeedName({
      titleDisplay: "Jordan 4 Delta",
      sku: "P-NIK-J4D-09-12",
      condition: "used",
      sizeLabel: "9",
      isUniqueUnit: true,
    });

    expect(lightspeedName).toBe("Jordan 4 Delta - P-NIK-J4D-09-12");
    expect(service.cleanWebsiteName(lightspeedName)).toBe("Jordan 4 Delta");
  });

  it("normalizes a Lightspeed export-style row into website-friendly fields", () => {
    const normalized = service.normalizeRemoteProducts([
      {
        id: "ls-product-1",
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
        supply_price: 120,
        price_including_tax: 160,
        images: [{ url: "https://example.com/j5.jpg" }],
      },
    ]);

    expect(normalized).toEqual([
      expect.objectContaining({
        lightspeedProductId: "ls-product-1",
        externalSku: "P-JDN-J05-9H-27",
        rawName: "A MA MANIERE JORDAN 5 - P-JDN-J05-9H-27",
        cleanName: "A MA MANIERE JORDAN 5",
        condition: "used",
        sizeLabel: "9.5M / 11W",
        priceCents: 16000,
        costCents: 12000,
        stock: 1,
        brand: "Jordan",
        model: null,
        category: "sneakers",
        isActive: true,
        isDeleted: false,
        imageUrls: ["https://example.com/j5.jpg"],
      }),
    ]);
  });

  it("normalizes category when Lightspeed returns an object instead of a string", () => {
    const normalized = service.normalizeRemoteProducts([
      {
        id: "ls-product-2",
        name: "ABOMINABLE TRACK SUIT - N-OTH-CLT-MD-30",
        sku: "N-OTH-CLT-MD-30",
        brand_name: "Other",
        product_category: { name: "Clothing" } as never,
        supply_price: 42.5,
        retail_price: 80,
        active: true,
        deleted_at: null,
        variant_option_one_name: "Condition",
        variant_option_one_value: "new",
        variant_option_two_name: "Size",
        variant_option_two_value: "MEDIUM",
        inventory_Main_Outlet: 1,
      },
    ]);

    expect(normalized[0]?.category).toBe("clothing");
    expect(normalized[0]?.priceCents).toBe(8000);
    expect(normalized[0]?.costCents).toBe(4250);
  });

  it("reads size from variant_options arrays and maps single shoe tokens to canonical website sizes", () => {
    const normalized = service.normalizeRemoteProducts([
      {
        id: "ls-family-3",
        name: "Adidas Campus 00s",
        images: [{ url: "https://example.com/product.jpg" }],
        variants: [
          {
            id: "ls-child-3",
            sku: "N-ADI-CMP-10-01",
            variant_options: [{ name: "Size", value: "10.5M" }],
            images: [{ url: "https://example.com/variant.jpg" }],
            inventory_Main_Outlet: 1,
          },
        ],
      },
    ]);

    expect(normalized[0]?.sizeLabel).toBe("10.5M / 12W");
    expect(normalized[0]?.imageUrls).toEqual(["https://example.com/product.jpg"]);
  });

  it("preserves raw imported sizes when no canonical mapping exists", () => {
    const normalized = service.normalizeRemoteProducts([
      {
        id: "ls-product-4",
        name: "Custom Ring",
        sku: "N-OTH-ACC-RAW-01",
        variant_options: [{ name: "Ring Size", value: "7.25" }],
        inventory_Main_Outlet: 1,
      },
    ]);

    expect(normalized[0]?.sizeLabel).toBe("7.25");
  });

  it("clamps negative remote stock to zero", () => {
    const normalized = service.normalizeRemoteProducts([
      {
        id: "ls-product-5",
        name: "Negative Inventory Product",
        sku: "NEG-001",
        inventory_Main_Outlet: -3,
      },
    ]);

    expect(normalized[0]?.stock).toBe(0);
  });

  it("defaults missing active flags to true for non-deleted remote products", () => {
    const normalized = service.normalizeRemoteProducts([
      {
        id: "ls-product-6",
        name: "Missing Active Flag Product",
        sku: "ACTIVE-DEFAULT-001",
        deleted_at: null,
      },
    ]);

    expect(normalized[0]?.isActive).toBe(true);
  });

  it("uses child ids when variant families are missing child skus", () => {
    const normalized = service.normalizeRemoteProducts([
      {
        id: "ls-family-4",
        name: "Family Product",
        sku: "PARENT-SKU",
        variants: [
          {
            id: "ls-child-4a",
            sku: null,
            variant_options: [{ name: "Size", value: "9M" }],
          },
          {
            id: "ls-child-4b",
            sku: null,
            variant_options: [{ name: "Size", value: "10M" }],
          },
        ],
      },
    ]);

    expect(normalized.map((item) => item.externalSku)).toEqual([
      "ls-child-4a",
      "ls-child-4b",
    ]);
  });

  it("classifies standard, variant-family, and child variant Lightspeed products", () => {
    expect(
      service.getRemoteProductKind({
        id: "ls-standard-1",
        sku: "STD-001",
      }),
    ).toBe("standard");

    expect(
      service.getRemoteProductKind({
        id: "ls-family-5",
        has_variants: true,
        variants: [{ id: "ls-child-5a", sku: "FAM-001" }],
      }),
    ).toBe("variant_family");

    expect(
      service.getRemoteProductKind({
        id: "ls-child-5a",
        variant_parent_id: "ls-family-5",
        sku: "FAM-001",
      }),
    ).toBe("variant_child");
  });
});
