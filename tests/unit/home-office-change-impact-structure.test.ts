import fs from "node:fs";
import path from "node:path";

describe("home office change impact modal structure", () => {
  it("delegates copy and toggle-button wiring to a focused view helper", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/HomeOfficeChangeImpactModal.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/nexus/presentation/admin/homeOfficeChangeImpactView",
    );
    expect(source).toContain("getHomeOfficeChangeImpactSubtitle(");
    expect(source).toContain("getHomeOfficeChangeImpactIntro(");
    expect(source).toContain("getHomeOfficeActionButtonClassName(");
    expect(source).toContain("updateOldHomeOfficeAction(");
  });
});
