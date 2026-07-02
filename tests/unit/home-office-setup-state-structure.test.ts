import fs from "node:fs";
import path from "node:path";

describe("home office setup state structure", () => {
  it("delegates home office modal state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/HomeOfficeSetupModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/useHomeOfficeSetupState");
    expect(source).toContain("useHomeOfficeSetupState(");
  });
});
