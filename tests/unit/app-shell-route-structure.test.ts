import fs from "node:fs";
import path from "node:path";

describe("app shell route structure", () => {
  it("routes root and admin layouts through app-shell presentation", () => {
    const rootLayoutSource = fs.readFileSync(
      path.join(process.cwd(), "app/layout.tsx"),
      "utf8",
    );
    const adminLayoutSource = fs.readFileSync(
      path.join(process.cwd(), "app/admin/layout.tsx"),
      "utf8",
    );

    expect(rootLayoutSource).toContain("@/modules/app-shell/presentation");
    expect(rootLayoutSource).toContain("<RootLayoutShell>");
    expect(adminLayoutSource).toContain("@/modules/app-shell/presentation");
    expect(adminLayoutSource).toContain("<AdminLayoutShell>");
  });

  it("routes error surfaces through app-shell presentation", () => {
    const errorSource = fs.readFileSync(
      path.join(process.cwd(), "app/error.tsx"),
      "utf8",
    );
    const adminErrorSource = fs.readFileSync(
      path.join(process.cwd(), "app/admin/error.tsx"),
      "utf8",
    );
    const notFoundSource = fs.readFileSync(
      path.join(process.cwd(), "app/not-found.tsx"),
      "utf8",
    );

    expect(errorSource).toContain("@/modules/app-shell/presentation");
    expect(errorSource).toContain("<SystemErrorPageContent");
    expect(adminErrorSource).toContain("@/modules/app-shell/presentation");
    expect(adminErrorSource).toContain("<AdminErrorPageContent");
    expect(notFoundSource).toContain("@/modules/app-shell/presentation");
    expect(notFoundSource).toContain("<NotFoundPageContent />");
  });
});
