import fs from "node:fs";
import path from "node:path";

describe("nexus tracker data structure", () => {
  it("delegates nexus summary and home-office requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/useNexusTrackerLoading.ts"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/nexusTrackerRequests");
    expect(source).toContain("loadNexusSummaryRequest()");
    expect(source).toContain("loadHomeOfficeStatusRequest()");
  });

  it("delegates nexus mutation requests to the focused request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/useNexusTrackerMutations.ts"),
      "utf8",
    );

    expect(source).toContain("updateNexusRegistrationRequest(");
    expect(source).toContain("updateNexusTypeRequest(");
  });
});
