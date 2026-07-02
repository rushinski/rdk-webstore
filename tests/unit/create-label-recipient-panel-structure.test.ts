import fs from "node:fs";
import path from "node:path";

describe("create label recipient panel structure", () => {
  it("delegates origin, address, package, and rate request sections to focused child components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/shipping/CreateLabelRecipientPanel.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/CreateLabelOriginSummary");
    expect(source).toContain("@/components/admin/shipping/CreateLabelAddressFields");
    expect(source).toContain("@/components/admin/shipping/CreateLabelPackageFields");
    expect(source).toContain("@/components/admin/shipping/CreateLabelRateRequestPanel");
  });
});
