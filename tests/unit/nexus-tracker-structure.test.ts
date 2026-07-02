import fs from "node:fs";
import path from "node:path";

describe("nexus tracker structure", () => {
  it("delegates nexus data loading and registration update workflows to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/NexusTrackerClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/useNexusTrackerData");
    expect(source).toContain("useNexusTrackerData({");
  });

  it("delegates nexus filtering, sorting, and display helpers to a focused module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/NexusTrackerClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/nexusTrackerView");
    expect(source).toContain("buildFilteredAndSortedStates(");
    expect(source).toContain("buildNexusTrackerMetrics(");
  });

  it("delegates tracker filters and state coverage table rendering to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/NexusTrackerClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/NexusTrackerFilters");
    expect(source).toContain("@/components/admin/nexus/NexusStateCoverageTable");
    expect(source).toContain("<NexusTrackerFilters");
    expect(source).toContain("<NexusStateCoverageTable");
  });
});
