import fs from "node:fs";
import path from "node:path";

describe("tax settings panel structure", () => {
  it("delegates settings lifecycle to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/settings/TaxSettingsPanel.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/settings/useTaxSettingsPanel");
    expect(source).toContain("useTaxSettingsPanel()");
  });

  it("delegates category card rendering to a focused component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/settings/TaxSettingsPanel.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/settings/TaxCodeCategoryCard");
    expect(source).toContain("<TaxCodeCategoryCard");
  });
});
