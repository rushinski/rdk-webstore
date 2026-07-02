import fs from "node:fs";
import path from "node:path";

describe("nexus tracker mutations structure", () => {
  it("delegates nexus registration and nexus-type update workflows to a focused mutation hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/useNexusTrackerData.ts"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/useNexusTrackerMutations");
    expect(source).toContain("useNexusTrackerMutations(");
  });
});
