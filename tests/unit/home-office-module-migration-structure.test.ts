import fs from "node:fs";
import path from "node:path";

describe("home office module migration structure", () => {
  it("keeps the module home-office modal wired to module-owned subcomponents and helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/HomeOfficeSetupModal.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/nexus/presentation/admin/HomeOfficeAddressForm",
    );
    expect(source).toContain(
      "@/modules/nexus/presentation/admin/HomeOfficeChangeImpactModal",
    );
    expect(source).toContain(
      "@/modules/nexus/presentation/admin/homeOfficeSetupRequests",
    );
    expect(source).toContain(
      "@/modules/nexus/presentation/admin/useHomeOfficeSetupState",
    );
  });
});
