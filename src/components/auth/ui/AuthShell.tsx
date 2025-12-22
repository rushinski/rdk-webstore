// components/auth/ui/AuthShell.tsx
import type { ReactNode } from "react";
import Image from "next/image";

type AuthShellProps = {
  children: ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none noise-overlay" />

      {/* Gradient beams */}
      <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-red-600/20 via-transparent to-transparent" />
      <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-red-600/10 via-transparent to-transparent" />
      
      {/* Subtle glow top-right */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl" />

      {/* Logo in top-left corner */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-10">
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8 sm:h-10 sm:w-10">
            <Image
              src="/images/rdk-logo.png"
              alt="RDK"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="hidden sm:block text-white text-sm font-semibold tracking-wider uppercase">
            RealDealKickz
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md">
          {/* Glass card */}
          <div className="rounded-2xl bg-zinc-950/60 backdrop-blur-xl border border-zinc-800/50 shadow-2xl p-6 sm:p-8">
            {children}
          </div>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-zinc-600">
        Authentic sneakers. Verified sellers. Every pair checked.
      </div>
    </div>
  );
}