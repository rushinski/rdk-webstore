import fs from "node:fs";
import path from "node:path";

describe("nexus tracker loading structure", () => {
  it("delegates nexus summary and home-office bootstrap loading to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/useNexusTrackerData.ts"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/useNexusTrackerLoading");
    expect(source).toContain("useNexusTrackerLoading(");
  });
});
