import fs from "node:fs";
import path from "node:path";

describe("nexus tracker top-level module migration structure", () => {
  it("routes the admin nexus page through the nexus module presentation layer", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/nexus/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/NexusTrackerClient");
  });

  it("keeps the module tracker client composed from module-owned tracker pieces", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/NexusTrackerClient.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/useNexusTrackerData");
    expect(source).toContain("@/modules/nexus/presentation/admin/useNexusTrackerUi");
    expect(source).toContain("@/modules/nexus/presentation/admin/nexusTrackerView");
    expect(source).toContain("@/modules/nexus/presentation/admin/NexusTrackerFilters");
    expect(source).toContain("@/modules/nexus/presentation/admin/NexusMap");
    expect(source).toContain("@/modules/nexus/presentation/admin/NexusStateCoverageTable");
  });
});
