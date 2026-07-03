import fs from "node:fs";
import path from "node:path";

describe("nexus tracker mutation state structure", () => {
  it("delegates home-office gating and selected-state reconciliation to a focused helper module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/useNexusTrackerMutations.ts"),
      "utf8",
    );
    const helperSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/nexus/nexusTrackerMutationState.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/nexusTrackerMutationState");
    expect(helperSource).toContain("shouldPromptForHomeOffice");
    expect(helperSource).toContain("resolveUpdatedSelectedState");
  });
});
