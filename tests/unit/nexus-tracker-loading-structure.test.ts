import fs from "node:fs";
import path from "node:path";

describe("nexus tracker loading structure", () => {
  it("delegates nexus summary and home-office bootstrap loading to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/useNexusTrackerData.ts"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/useNexusTrackerLoading");
    expect(source).toContain("useNexusTrackerLoading(");
  });
});
