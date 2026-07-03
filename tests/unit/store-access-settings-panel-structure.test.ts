import fs from "node:fs";
import path from "node:path";

describe("store access settings panel structure", () => {
  it("delegates settings lifecycle to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/settings/StoreAccessSettingsPanel.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/settings/useStoreAccessSettingsPanel");
    expect(source).toContain("useStoreAccessSettingsPanel()");
  });

  it("delegates section rendering to focused setting cards", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/settings/StoreAccessSettingsPanel.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("@/components/admin/settings/StoreAccessCards");
    expect(source).toContain("<CheckoutLockCard");
    expect(source).not.toContain("<SiteLockCard");
  });
});
