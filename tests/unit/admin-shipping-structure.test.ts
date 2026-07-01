import fs from "node:fs";
import path from "node:path";

describe("admin shipping structure", () => {
  it("delegates shipping data loading and pagination orchestration to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/AdminShippingScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/useAdminShippingData");
    expect(source).toContain("useAdminShippingData({");
  });

  it("delegates shipping mutation and origin workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/AdminShippingScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/useAdminShippingMutations");
    expect(source).toContain("useAdminShippingMutations({");
  });

  it("delegates shipping display and package helper logic to a focused module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/shipping/AdminShippingScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/shipping/shippingView");
    expect(source).toContain("buildPackageProfile(");
    expect(source).toContain("formatOriginAddress(");
  });
});
