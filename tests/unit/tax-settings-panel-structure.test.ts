import fs from "node:fs";
import path from "node:path";

describe("tax settings panel structure", () => {
  it("delegates settings lifecycle to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/settings/presentation/admin/tax/TaxSettingsPanel.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/settings/presentation/admin/tax/useTaxSettingsPanel");
    expect(source).toContain("useTaxSettingsPanel()");
  });

  it("delegates category card rendering to a focused component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/settings/presentation/admin/tax/TaxSettingsPanel.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/settings/presentation/admin/tax/TaxCodeCategoryCard");
    expect(source).toContain("<TaxCodeCategoryCard");
  });
});
