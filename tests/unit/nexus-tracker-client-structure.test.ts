import fs from "node:fs";
import path from "node:path";

describe("nexus tracker client structure", () => {
  it("delegates header actions, status alerts, and overview cards to focused presentation components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/NexusTrackerClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/NexusTrackerHeaderActions");
    expect(source).toContain("@/modules/nexus/presentation/admin/NexusTrackerStatusAlert");
    expect(source).toContain("@/modules/nexus/presentation/admin/NexusTrackerOverviewCards");
    expect(source).toContain("<NexusTrackerHeaderActions");
    expect(source).toContain("<NexusTrackerStatusAlert");
    expect(source).toContain("<NexusTrackerOverviewCards");
  });
});
