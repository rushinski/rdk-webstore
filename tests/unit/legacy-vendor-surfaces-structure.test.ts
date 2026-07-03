import fs from "node:fs";
import path from "node:path";

describe("legacy vendor surface removal scope", () => {
  it("keeps removed vendor artifacts out of the active codebase", () => {
    const removedTargets = [
      "app/api/webhooks/payrilla/route.ts",
      "docs/payrilla/WEBHOOKS.md",
      "docs/payrilla/HOSTED_TOKENIZATION.md",
      "docs/payrilla/DIGITAL_WALLETS.md",
      "docs/payrilla/API_SPEC.md",
    ];

    for (const target of removedTargets) {
      expect(fs.existsSync(path.join(process.cwd(), target))).toBe(false);
    }
  });
});
