import fs from "node:fs";
import path from "node:path";

describe("home office setup data structure", () => {
  it("delegates home office fetch and submit requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/HomeOfficeSetupModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/homeOfficeSetupRequests");
    expect(source).toContain("loadHomeOfficeSetupDataRequest(");
    expect(source).toContain("submitHomeOfficeSetupRequest(");
  });
});
