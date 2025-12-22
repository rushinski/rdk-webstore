// components/auth/ui/AuthShell.tsx
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

type AuthShellProps = {
  children: ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-black items-center justify-center p-12">
        <div className="max-w-xl">
          <Link href="/" className="inline-block mb-12">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12">
                <Image
                  src="/images/rdk-logo.png"
                  alt="RDK"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-white text-xl font-bold tracking-wider uppercase">
                RealDealKickz
              </span>
            </div>
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Authentic sneakers.
            <br />
            Verified sellers.
            <br />
            <span className="text-red-600">Every pair checked.</span>
          </h1>

          <p className="text-lg text-zinc-400 leading-relaxed">
            Join thousands of sneakerheads who trust Real Deal Kickz for authentic kicks, 
            fast shipping, and unbeatable customer service.
          </p>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 lg:max-w-xl bg-zinc-950 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden inline-block mb-8">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <Image
                  src="/images/rdk-logo.png"
                  alt="RDK"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-white text-lg font-bold tracking-wider uppercase">
                RealDealKickz
              </span>
            </div>
          </Link>

          {children}
        </div>
      </div>
    </div>
  );
}