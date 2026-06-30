import type { ReactNode } from "react";

import { AuthPageShell } from "@/components/auth/AuthPageShell";

type LeftVariant = "login" | "register" | "2fa" | "forgot";

type AuthShellProps = {
  children: ReactNode;
  leftVariant?: LeftVariant;
};

const SHELL_COPY: Record<LeftVariant, { title: string; description: string }> = {
  login: {
    title: "LOGIN",
    description: "Enter your email and password to sign in.",
  },
  register: {
    title: "CREATE ACCOUNT",
    description: "Create an account for faster checkout and order history.",
  },
  "2fa": {
    title: "TWO-FACTOR AUTH",
    description: "Enter the code from your authenticator app to continue.",
  },
  forgot: {
    title: "RESET PASSWORD",
    description: "Enter your email and we will send reset instructions.",
  },
};

export default function AuthShell({ children, leftVariant = "login" }: AuthShellProps) {
  const copy = SHELL_COPY[leftVariant];

  return (
    <AuthPageShell title={copy.title} description={copy.description}>
      {children}
    </AuthPageShell>
  );
}
