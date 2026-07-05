import fs from "node:fs";
import path from "node:path";

describe("store access settings panel structure", () => {
  it("delegates settings lifecycle to a focused hook", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/settings/presentation/admin/store-access/StoreAccessSettingsPanel.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/settings/presentation/admin/store-access/useStoreAccessSettingsPanel",
    );
    expect(source).toContain("useStoreAccessSettingsPanel()");
  });

  it("delegates section rendering to focused setting cards", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/settings/presentation/admin/store-access/StoreAccessSettingsPanel.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/settings/presentation/admin/store-access/StoreAccessCards",
    );
    expect(source).toContain("<CheckoutLockCard");
    expect(source).not.toContain("<SiteLockCard");
  });
});
