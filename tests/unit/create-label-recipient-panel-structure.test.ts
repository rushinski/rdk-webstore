import fs from "node:fs";
import path from "node:path";

describe("create label recipient panel structure", () => {
  it("delegates origin, address, package, and rate request sections to focused child components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/shipping/CreateLabelRecipientPanel.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/CreateLabelOriginSummary",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/CreateLabelAddressFields",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/CreateLabelPackageFields",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/shipping/CreateLabelRateRequestPanel",
    );
  });
});
