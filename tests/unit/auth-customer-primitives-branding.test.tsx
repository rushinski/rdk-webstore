jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

import { renderToStaticMarkup } from "react-dom/server";

import { PasswordLoginForm } from "@/components/auth/login/PasswordLoginForm";
import { RegisterForm } from "@/components/auth/register/RegisterForm";
import { QRDisplay } from "@/components/auth/2fa/QRDisplay";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";

describe("auth customer primitives", () => {
  it("renders brand-forward login primitives without legacy zinc or red action links", () => {
    const html = renderToStaticMarkup(
      <PasswordLoginForm
        onRequiresEmailVerification={() => undefined}
        onSwitchToOtp={() => undefined}
        onForgotPassword={() => undefined}
      />,
    );

    expect(html).toContain("Back to shopping");
    expect(html).toContain("Sign in with email code instead");
    expect(html).toContain("Create account");
    expect(html).not.toContain("text-zinc-500");
    expect(html).not.toContain("text-red-600");
    expect(html).not.toContain("bg-zinc-900");
  });

  it("renders brand-forward 2fa support surfaces", () => {
    const html = renderToStaticMarkup(
      <>
        <AuthHeader title="Set up 2FA" description="Secure your account." />
        <QRDisplay qrCode="data:image/png;base64,abc" />
      </>,
    );

    expect(html).toContain("Secure your account.");
    expect(html).not.toContain("text-zinc-500");
    expect(html).not.toContain("border-zinc-800");
    expect(html).not.toContain("bg-zinc-900");
  });

  it("renders the registration flow without legacy auth chrome", () => {
    const html = renderToStaticMarkup(<RegisterForm />);

    expect(html).toContain("Create account");
    expect(html).toContain("Back to shopping");
    expect(html).not.toContain("text-zinc-500");
    expect(html).not.toContain("text-zinc-600");
    expect(html).not.toContain("text-white");
  });
});
