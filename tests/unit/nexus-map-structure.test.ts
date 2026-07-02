import fs from "node:fs";
import path from "node:path";

describe("nexus map structure", () => {
  it("delegates nexus map topology loading and hover interaction state to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/nexus/NexusMap.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/nexus/useNexusMapInteraction");
    expect(source).toContain("useNexusMapInteraction(");
  });
});
