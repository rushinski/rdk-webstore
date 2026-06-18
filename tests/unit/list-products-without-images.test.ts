import { parseArgs } from "@/../scripts/list-products-without-images";

describe("list-products-without-images", () => {
  it("parses tenant json and archived flags", () => {
    expect(
      parseArgs(["--tenant", "tenant-1", "--json", "--include-archived", "--out", "tmp/out.json"]),
    ).toEqual({
      tenantId: "tenant-1",
      json: true,
      includeArchived: true,
      outPath: "tmp/out.json",
    });
  });

  it("uses defaults when no flags are provided", () => {
    expect(parseArgs([])).toEqual({
      tenantId: null,
      json: false,
      includeArchived: false,
      outPath: null,
    });
  });
});
