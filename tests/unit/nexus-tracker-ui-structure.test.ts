import fs from "node:fs";
import path from "node:path";

describe("nexus tracker ui structure", () => {
  it("delegates tracker ui filter and sorting state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/NexusTrackerClient.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/useNexusTrackerUi");
    expect(source).toContain("useNexusTrackerUi(");
  });

  it("keeps nexus tracker filter and sort helpers inside the focused ui hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/useNexusTrackerUi.ts"),
      "utf8",
    );

    expect(source).toContain("buildFilterRegisteredOptions()");
    expect(source).toContain("buildLegendItems()");
    expect(source).toContain("handleSort =");
  });
});
