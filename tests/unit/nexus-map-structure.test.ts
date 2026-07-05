import fs from "node:fs";
import path from "node:path";

describe("nexus map structure", () => {
  it("delegates nexus map topology loading and hover interaction state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/modules/nexus/presentation/admin/NexusMap.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/nexus/presentation/admin/useNexusMapInteraction");
    expect(source).toContain("useNexusMapInteraction(");
  });
});
