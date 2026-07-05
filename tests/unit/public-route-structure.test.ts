import fs from "node:fs";
import path from "node:path";

describe("public route structure", () => {
  it("routes auth pages through module presentation entrypoints", () => {
    const loginSource = fs.readFileSync(
      path.join(process.cwd(), "app/auth/login/page.tsx"),
      "utf8",
    );
    const registerSource = fs.readFileSync(
      path.join(process.cwd(), "app/auth/register/page.tsx"),
      "utf8",
    );
    const setupSource = fs.readFileSync(
      path.join(process.cwd(), "app/auth/2fa/setup/page.tsx"),
      "utf8",
    );
    const challengeSource = fs.readFileSync(
      path.join(process.cwd(), "app/auth/2fa/challenge/page.tsx"),
      "utf8",
    );

    expect(loginSource).toContain("@/modules/auth/presentation/public");
    expect(registerSource).toContain("@/modules/auth/presentation/public");
    expect(setupSource).toContain("@/modules/auth/presentation/public");
    expect(challengeSource).toContain("@/modules/auth/presentation/public");
  });

  it("routes account and contact pages through module presentation entrypoints", () => {
    const accountSource = fs.readFileSync(
      path.join(process.cwd(), "app/account/page.tsx"),
      "utf8",
    );
    const contactSource = fs.readFileSync(
      path.join(process.cwd(), "app/contact/page.tsx"),
      "utf8",
    );
    const bugReportSource = fs.readFileSync(
      path.join(process.cwd(), "app/bug-report/page.tsx"),
      "utf8",
    );
    const emailConfirmSource = fs.readFileSync(
      path.join(process.cwd(), "app/email/confirm/page.tsx"),
      "utf8",
    );

    expect(accountSource).toContain("@/modules/account/presentation/public");
    expect(contactSource).toContain("@/modules/support/presentation/public");
    expect(bugReportSource).toContain("@/modules/support/presentation/public");
    expect(emailConfirmSource).toContain("@/modules/marketing/presentation/public");
  });
});
