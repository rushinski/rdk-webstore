import fs from "node:fs";
import path from "node:path";

describe("nexus tracker module hooks migration structure", () => {
  it("composes the module data hook from module-owned loading and mutation hooks", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/useNexusTrackerData.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/useNexusTrackerLoading");
    expect(source).toContain("@/modules/nexus/presentation/admin/useNexusTrackerMutations");
  });

  it("keeps the module mutations hook wired to module-owned request and state helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/useNexusTrackerMutations.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/nexus/presentation/admin/nexusTrackerMutationState",
    );
    expect(source).toContain("@/modules/nexus/presentation/admin/nexusTrackerRequests");
  });

  it("keeps the module loading hook wired to module-owned request helpers", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/useNexusTrackerLoading.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/nexusTrackerRequests");
  });
});
