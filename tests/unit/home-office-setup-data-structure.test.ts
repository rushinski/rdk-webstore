import fs from "node:fs";
import path from "node:path";

describe("home office setup data structure", () => {
  it("delegates home office fetch and submit requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/HomeOfficeSetupModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/homeOfficeSetupRequests");
    expect(source).toContain("loadHomeOfficeSetupDataRequest(");
    expect(source).toContain("submitHomeOfficeSetupRequest(");
  });
});
