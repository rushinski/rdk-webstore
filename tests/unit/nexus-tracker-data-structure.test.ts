import fs from "node:fs";
import path from "node:path";

describe("nexus tracker data structure", () => {
  it("delegates nexus summary and home-office requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/useNexusTrackerLoading.ts"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/nexusTrackerRequests");
    expect(source).toContain("loadNexusSummaryRequest()");
    expect(source).toContain("loadHomeOfficeStatusRequest()");
  });

  it("delegates nexus mutation requests to the focused request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/useNexusTrackerMutations.ts"),
      "utf8",
    );

    expect(source).toContain("updateNexusRegistrationRequest(");
    expect(source).toContain("updateNexusTypeRequest(");
  });
});
