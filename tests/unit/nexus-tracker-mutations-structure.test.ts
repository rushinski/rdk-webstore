import fs from "node:fs";
import path from "node:path";

describe("nexus tracker mutations structure", () => {
  it("delegates nexus registration and nexus-type update workflows to a focused mutation hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/useNexusTrackerData.ts"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/useNexusTrackerMutations");
    expect(source).toContain("useNexusTrackerMutations(");
  });
});
