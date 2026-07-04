import fs from "node:fs";
import path from "node:path";

describe("home office setup modal structure", () => {
  it("delegates the main address editor and relocation impact flow to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/HomeOfficeSetupModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/HomeOfficeAddressForm");
    expect(source).toContain(
      "@/modules/nexus/presentation/admin/HomeOfficeChangeImpactModal",
    );
    expect(source).toContain("<HomeOfficeAddressForm");
    expect(source).toContain("<HomeOfficeChangeImpactModal");
  });

  it("delegates shared home office types to a focused module", () => {
    const stateSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/useHomeOfficeSetupState.ts",
      ),
      "utf8",
    );
    const typesSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/homeOfficeSetupTypes.ts",
      ),
      "utf8",
    );

    expect(stateSource).toContain("@/modules/nexus/presentation/admin/homeOfficeSetupTypes");
    expect(typesSource).toContain("type HomeOfficeFormData");
    expect(typesSource).toContain("type OldHomeOfficeAction");
  });
});
