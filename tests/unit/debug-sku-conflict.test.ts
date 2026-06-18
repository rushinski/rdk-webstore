import { parseArgs } from "@/../scripts/debug-sku-conflict";

describe("debug-sku-conflict parseArgs", () => {
  it("parses repeated sku flags", () => {
    expect(parseArgs(["--sku", "11979", "--sku", "12036"])).toEqual({
      tenantId: null,
      skus: ["11979", "12036"],
      json: false,
    });
  });

  it("parses tenant and json flags", () => {
    expect(parseArgs(["--sku", "11979", "--tenant", "tenant-1", "--json"])).toEqual({
      tenantId: "tenant-1",
      skus: ["11979"],
      json: true,
    });
  });

  it("rejects missing sku", () => {
    expect(() => parseArgs(["--json"])).toThrow(
      "Usage: tsx scripts/debug-sku-conflict.ts --sku <value> [--sku <value>] [--tenant <id>] [--json]",
    );
  });
});
