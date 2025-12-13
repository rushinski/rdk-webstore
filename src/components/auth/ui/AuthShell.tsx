// components/auth/ui/AuthShell.tsx
import type { ReactNode } from "react";
import AuthCard from "@/components/auth/ui/AuthCard";
import AuthLeftPanel, { type AuthLeftPanelVariant } from "@/components/auth/ui/AuthLeftPanel";

type AuthShellProps = {
  children: ReactNode;
  cardClassName?: string;
  leftVariant?: AuthLeftPanelVariant; // "login" | "register"
};

export default function AuthShell({
  children,
  cardClassName = "",
  leftVariant = "login",
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="relative hidden md:flex md:w-5/12 lg:w-1/2 overflow-hidden bg-gradient-to-br from-red-700 via-black to-neutral-900">
          <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-red-500/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-red-900/50 blur-3xl" />

          <AuthLeftPanel variant={leftVariant} />
        </aside>

        <main className="flex w-full md:w-7/12 lg:w-1/2 items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <AuthCard className={"bg-white dark:bg-neutral-950 " + cardClassName}>
            {children}
          </AuthCard>
        </main>
      </div>
    </div>
  );
}
