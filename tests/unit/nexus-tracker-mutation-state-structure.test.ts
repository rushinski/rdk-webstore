import fs from "node:fs";
import path from "node:path";

describe("nexus tracker mutation state structure", () => {
  it("delegates home-office gating and selected-state reconciliation to a focused helper module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/useNexusTrackerMutations.ts"),
      "utf8",
    );
    const helperSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/nexus/presentation/admin/nexusTrackerMutationState.ts",
      ),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/nexusTrackerMutationState");
    expect(helperSource).toContain("shouldPromptForHomeOffice");
    expect(helperSource).toContain("resolveUpdatedSelectedState");
  });
});
