import fs from "node:fs";
import path from "node:path";

describe("nexus tracker structure", () => {
  it("delegates nexus data loading and registration update workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/NexusTrackerClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/useNexusTrackerData");
    expect(source).toContain("useNexusTrackerData({");
  });

  it("delegates nexus filtering, sorting, and display helpers to a focused module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/NexusTrackerClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/nexusTrackerView");
    expect(source).toContain("buildFilteredAndSortedStates(");
    expect(source).toContain("buildNexusTrackerMetrics(");
  });

  it("delegates tracker filters and state coverage table rendering to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/NexusTrackerClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/NexusTrackerFilters");
    expect(source).toContain("@/modules/nexus/presentation/admin/NexusStateCoverageTable");
    expect(source).toContain("<NexusTrackerFilters");
    expect(source).toContain("<NexusStateCoverageTable");
  });
});
