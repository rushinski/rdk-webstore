import { Buffer } from "buffer";
import {
  buildVariants,
  deriveSizeType,
  groupRowsBySku,
  loadRows,
  normalizeSquareRow,
  type RawSquareRow,
} from "../../../scripts/import-square-inventory";

jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
}));

jest.mock("xlsx", () => ({
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

const mockedReadFile = jest.requireMock("fs/promises").readFile as jest.Mock;
const mockedXlsx = jest.requireMock("xlsx") as {
  readFile: jest.Mock;
  utils: { sheet_to_json: jest.Mock };
};

describe("import-square-inventory helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes a raw row with minimal data", () => {
    const raw = normalizeSquareRow({
      SKU: "  ABC123 ",
      Name: "Test Shoe ",
      Price: "199.99",
      Quantity: "5",
    });

    expect(raw).toEqual(
      expect.objectContaining({
        sku: "ABC123",
        title: "Test Shoe",
        price_cents: 19999,
        quantity: 5,
        size_label: undefined,
      })
    );
  });

  it("loads rows from CSV (Checkpoint 1/2)", async () => {
    const csv = [
      "SKU,Name,Brand,Model,Category,Condition,Price,Cost,Quantity,Size,ImageFilename,SupabaseImagePath",
      "SKU1,Item One,Nike,Air,shoe,new,150,90,3,10,sku1.jpg,bucket/sku1.jpg",
      "SKU1,Item One,Nike,Air,shoe,new,150,90,2,9.5,sku1b.jpg,bucket/sku1b.jpg",
      "SKU2,Hoodie,Xyz,Hoodie Pro,hoodie,new,120,70,5,L,hoodie.jpg,bucket/hoodie.jpg",
    ].join("\n");

    mockedReadFile.mockResolvedValue(Buffer.from(csv, "utf-8"));

    const rows = await loadRows("inventory.csv");

    expect(mockedReadFile).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        sku: "SKU1",
        title: "Item One",
        brand: "Nike",
        model: "Air",
        category: "shoe",
        condition: "new",
        price_cents: 15000,
        cost_cents: 9000,
        quantity: 3,
        size_label: "10",
        image_filename: "sku1.jpg",
        supabase_image_path: "bucket/sku1.jpg",
      })
    );
    expect(rows[2]).toEqual(
      expect.objectContaining({
        sku: "SKU2",
        category: "hoodie",
        price_cents: 12000,
        cost_cents: 7000,
        quantity: 5,
        size_label: "L",
        supabase_image_path: "bucket/hoodie.jpg",
      })
    );
  });

  it("loads rows from XLSX (Checkpoint 1/2 branch)", async () => {
    mockedXlsx.readFile.mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: { A1: "fake" } },
    });
    mockedXlsx.utils.sheet_to_json.mockReturnValue([
      { SKU: "X1", Name: "Item X", Price: 50, Quantity: 1 },
    ]);

    const rows = await loadRows("inventory.xlsx");

    expect(mockedXlsx.readFile).toHaveBeenCalledWith("inventory.xlsx");
    expect(mockedXlsx.utils.sheet_to_json).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([
      expect.objectContaining({
        sku: "X1",
        title: "Item X",
        price_cents: 5000,
        quantity: 1,
      }),
    ]);
  });

  it("groups rows by SKU (Checkpoint 3)", () => {
    const rows: RawSquareRow[] = [
      { sku: "A", title: "One" },
      { sku: "A", title: "Two" },
      { sku: "B", title: "Three" },
    ];

    const grouped = groupRowsBySku(rows);

    expect(grouped.size).toBe(2);
    expect(grouped.get("A")?.map((r) => r.title)).toEqual(["One", "Two"]);
    expect(grouped.get("B")?.map((r) => r.title)).toEqual(["Three"]);
  });

  it("builds variants and derives size type (Checkpoint 5 payload prep)", () => {
    const rows: RawSquareRow[] = [
      { sku: "S1", title: "Sneaker", category: "sneaker", price_cents: 10000, quantity: 2, size_label: "10" },
      { sku: "H1", title: "Hoodie", category: "hoodie", price_cents: 8000, quantity: 1, size_label: "L" },
      { sku: "C1", title: "Custom Shoe", category: "custom", price_cents: 9000, quantity: 3, size_label: "8" },
    ];

    const variants = buildVariants(rows);

    expect(variants).toEqual([
      expect.objectContaining({ price_cents: 10000, stock: 2, size_label: "10", size_type: "shoe" }),
      expect.objectContaining({ price_cents: 8000, stock: 1, size_label: "L", size_type: "clothing" }),
      expect.objectContaining({ price_cents: 9000, stock: 3, size_label: "8", size_type: "custom" }),
    ]);

    expect(deriveSizeType(rows[0])).toBe("shoe");
    expect(deriveSizeType(rows[1])).toBe("clothing");
    expect(deriveSizeType(rows[2])).toBe("custom");
  });
});
