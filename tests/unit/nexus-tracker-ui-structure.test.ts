import fs from "node:fs";
import path from "node:path";

describe("nexus tracker ui structure", () => {
  it("delegates tracker ui filter and sorting state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/NexusTrackerClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/useNexusTrackerUi");
    expect(source).toContain("useNexusTrackerUi(");
  });

  it("keeps nexus tracker filter and sort helpers inside the focused ui hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/useNexusTrackerUi.ts"),
      "utf8",
    );

    expect(source).toContain("buildFilterRegisteredOptions()");
    expect(source).toContain("buildLegendItems()");
    expect(source).toContain("handleSort =");
  });
});
