import fs from "node:fs";
import path from "node:path";

describe("home office setup state structure", () => {
  it("delegates home office modal state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/HomeOfficeSetupModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/useHomeOfficeSetupState");
    expect(source).toContain("useHomeOfficeSetupState(");
  });
});
