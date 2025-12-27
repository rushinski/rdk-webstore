import { parseTitleWithCatalog, type CatalogBrandAlias, type CatalogModelAlias } from "@/services/product-title-parser";

const brandAliases: CatalogBrandAlias[] = [
  {
    brandId: "nb",
    brandLabel: "New Balance",
    groupKey: "new_balance",
    aliasLabel: "New Balance",
    aliasNormalized: "new balance",
    priority: 0,
  },
  {
    brandId: "nb",
    brandLabel: "New Balance",
    groupKey: "new_balance",
    aliasLabel: "NB",
    aliasNormalized: "nb",
    priority: 10,
  },
  {
    brandId: "asics",
    brandLabel: "ASICS",
    groupKey: "asics",
    aliasLabel: "ASICS",
    aliasNormalized: "asics",
    priority: 0,
  },
  {
    brandId: "asics",
    brandLabel: "ASICS",
    groupKey: "asics",
    aliasLabel: "Ascis",
    aliasNormalized: "ascis",
    priority: 1,
  },
  {
    brandId: "mmy",
    brandLabel: "Maison Mihara Yasuhiro",
    groupKey: "designer",
    aliasLabel: "Maison Mihara",
    aliasNormalized: "maison mihara",
    priority: 5,
  },
  {
    brandId: "nike",
    brandLabel: "Nike",
    groupKey: "nike",
    aliasLabel: "Nike",
    aliasNormalized: "nike",
    priority: 0,
  },
];

const modelAliasesByBrand: Record<string, CatalogModelAlias[]> = {
  nb: [
    {
      modelId: "2002r",
      modelLabel: "2002R",
      brandId: "nb",
      aliasLabel: "2002R",
      aliasNormalized: "2002r",
      priority: 0,
    },
  ],
  asics: [
    {
      modelId: "gel-kayano-14",
      modelLabel: "Gel-Kayano 14",
      brandId: "asics",
      aliasLabel: "Gel-Kayano 14",
      aliasNormalized: "gel kayano 14",
      priority: 0,
    },
  ],
  mmy: [
    {
      modelId: "hank",
      modelLabel: "Hank",
      brandId: "mmy",
      aliasLabel: "Hank",
      aliasNormalized: "hank",
      priority: 0,
    },
  ],
  nike: [
    {
      modelId: "dunk-low",
      modelLabel: "Dunk Low",
      brandId: "nike",
      aliasLabel: "Dunk Low",
      aliasNormalized: "dunk low",
      priority: 0,
    },
  ],
};

describe("parseTitleWithCatalog", () => {
  it("parses brand/model and name regardless of order", () => {
    const input = {
      titleRaw: "Protection Pack 2002R New Balance Stone Grey",
      category: "sneakers",
    } as const;

    const parsed = parseTitleWithCatalog(input, {
      brandAliases,
      modelAliasesByBrand,
    });

    expect(parsed.brand.label).toBe("New Balance");
    expect(parsed.model.label).toBe("2002R");
    expect(parsed.name).toBe("Protection Pack Stone Grey");
  });

  it("handles reversed brand/model order", () => {
    const input = {
      titleRaw: "2002R New Balance Protection Pack",
      category: "sneakers",
    } as const;

    const parsed = parseTitleWithCatalog(input, {
      brandAliases,
      modelAliasesByBrand,
    });

    expect(parsed.brand.label).toBe("New Balance");
    expect(parsed.model.label).toBe("2002R");
    expect(parsed.name).toBe("Protection Pack");
  });

  it("keeps model null for non-sneakers", () => {
    const input = {
      titleRaw: "Nike Club Fleece Hoodie",
      category: "clothing",
    } as const;

    const parsed = parseTitleWithCatalog(input, {
      brandAliases,
      modelAliasesByBrand,
    });

    expect(parsed.brand.label).toBe("Nike");
    expect(parsed.model.label).toBeNull();
    expect(parsed.name).toBe("Club Fleece Hoodie");
  });

  it("supports brand aliases for designer models", () => {
    const input = {
      titleRaw: "Maison Mihara Hank Low",
      category: "sneakers",
    } as const;

    const parsed = parseTitleWithCatalog(input, {
      brandAliases,
      modelAliasesByBrand,
    });

    expect(parsed.brand.label).toBe("Maison Mihara Yasuhiro");
    expect(parsed.model.label).toBe("Hank");
    expect(parsed.name).toBe("Low");
  });

  it("accepts high-confidence aliases", () => {
    const input = {
      titleRaw: "Ascis Gel-Kayano 14 Cream",
      category: "sneakers",
    } as const;

    const parsed = parseTitleWithCatalog(input, {
      brandAliases,
      modelAliasesByBrand,
    });

    expect(parsed.brand.label).toBe("ASICS");
    expect(parsed.model.label).toBe("Gel-Kayano 14");
    expect(parsed.name).toBe("Cream");
  });

  it("does not block unknown brands", () => {
    const input = {
      titleRaw: "Acme Runner 123",
      category: "sneakers",
    } as const;

    const parsed = parseTitleWithCatalog(input, {
      brandAliases,
      modelAliasesByBrand,
    });

    expect(parsed.brand.isVerified).toBe(false);
    expect(parsed.titleDisplay).toBe("Acme Runner 123");
  });
});
