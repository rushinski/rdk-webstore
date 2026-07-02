import fs from "node:fs";
import path from "node:path";

describe("origin modal structure", () => {
  it("delegates origin address field rendering to a focused component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/OriginModal.tsx"),
      "utf8",
    );

    expect(source).toContain("./OriginAddressFields");
    expect(source).toContain("<OriginAddressFields");
  });

  it("defines origin field metadata in a focused config module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/OriginAddressFields.tsx"),
      "utf8",
    );

    expect(source).toContain("./originModalFields");
    expect(source).toContain("ORIGIN_MODAL_FIELDS.map");
  });
});
