import fs from "node:fs";
import path from "node:path";

describe("nexus logging structure", () => {
  it("uses the shared frontend logger across nexus data and modal surfaces", () => {
    const files = [
      "src/components/admin/nexus/useNexusTrackerLoading.ts",
      "src/components/admin/nexus/useNexusTrackerMutations.ts",
      "src/components/admin/nexus/NexusMap.tsx",
      "src/components/admin/nexus/StateDetailModal.tsx",
      "src/components/admin/nexus/HomeOfficeSetupModal.tsx",
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain("@/lib/utils/log");
      expect(source).not.toContain("console.error(");
    }
  });
});
