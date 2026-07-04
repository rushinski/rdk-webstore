import fs from "node:fs";
import path from "node:path";

describe("nexus logging structure", () => {
  it("uses the shared frontend logger across nexus data and modal surfaces", () => {
    const files = [
      "src/modules/nexus/presentation/admin/useNexusTrackerLoading.ts",
      "src/modules/nexus/presentation/admin/useNexusTrackerMutations.ts",
      "src/modules/nexus/presentation/admin/useNexusMapInteraction.ts",
      "src/modules/nexus/presentation/admin/useStateDetailSalesLog.ts",
      "src/modules/nexus/presentation/admin/HomeOfficeSetupModal.tsx",
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain("@/lib/utils/log");
      expect(source).not.toContain("console.error(");
    }
  });
});
