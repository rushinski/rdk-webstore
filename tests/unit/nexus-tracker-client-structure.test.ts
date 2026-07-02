import fs from "node:fs";
import path from "node:path";

describe("nexus tracker client structure", () => {
  it("delegates header actions, status alerts, and overview cards to focused presentation components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/NexusTrackerClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/NexusTrackerHeaderActions");
    expect(source).toContain("@/components/admin/nexus/NexusTrackerStatusAlert");
    expect(source).toContain("@/components/admin/nexus/NexusTrackerOverviewCards");
    expect(source).toContain("<NexusTrackerHeaderActions");
    expect(source).toContain("<NexusTrackerStatusAlert");
    expect(source).toContain("<NexusTrackerOverviewCards");
  });
});
