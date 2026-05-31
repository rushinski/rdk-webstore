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
});
