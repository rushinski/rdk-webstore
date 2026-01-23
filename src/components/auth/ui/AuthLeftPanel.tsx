// components/auth/ui/AuthLeftPanel.tsx
import Image from "next/image";

export type AuthLeftPanelVariant = "login" | "register";

const COPY: Record<
  AuthLeftPanelVariant,
  {
    headlineTop: string;
    headlineBottom: string;
    blurb: string;
  }
> = {
  login: {
    headlineTop: "Welcome back,",
    headlineBottom: "pick up where you left off.",
    blurb:
      "Check your orders, track new drops, and secure pairs before they’re gone. Thousands of sneakerheads already trust Realdealkickzsc.",
  },
  register: {
    headlineTop: "Join thousands of buyers",
    headlineBottom: "who shop with confidence.",
    blurb:
      "Verified kicks, fast communication, and a reseller trusted by thousands of customers with hundreds of positive reviews. Create an account to never miss the next drop.",
  },
};

export default function AuthLeftPanel({
  variant = "login",
}: {
  variant?: AuthLeftPanelVariant;
}) {
  const v = COPY[variant];

  return (
    <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-10 lg:px-14 lg:py-12">
      {/* Brand watermark on desktop */}
      <div className="pointer-events-none select-none absolute -left-4 top-20 hidden lg:block opacity-[0.06]">
        <p className="text-7xl xl:text-8xl font-black uppercase tracking-[0.25em] leading-none">
          RDK
        </p>
      </div>

      {/* Top section */}
      <div className="relative">
        {/* Logo + brand name in top-left */}
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-xl bg-black/40 border border-white/10 overflow-hidden shadow-sm shadow-black/40">
            <Image
              src="/images/rdk-logo.png"
              alt="Realdealkickzsc logo"
              fill
              sizes="36px"
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-100/90">
            Realdealkickzsc
          </span>
        </div>

        {/* Divider under logo */}
        <div className="mt-5 h-px w-12 rounded-full bg-gradient-to-r from-white/40 via-white/10 to-transparent" />

        {/* Headline */}
        <h2 className="mt-6 text-3xl lg:text-4xl font-semibold text-white">
          {v.headlineTop}
          <span className="block text-red-200/95">{v.headlineBottom}</span>
        </h2>

        {/* Blurb */}
        <p className="mt-4 max-w-md text-sm text-neutral-200/80">{v.blurb}</p>
      </div>
    </div>
  );
}
