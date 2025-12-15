// components/auth/ui/AuthLeftPanel.tsx
import Image from "next/image";

export type AuthLeftPanelVariant = "login" | "register";

const COPY: Record<
  AuthLeftPanelVariant,
  {
    headlineTop: string;
    headlineBottom: string;
    blurb: string;
    footerTitle: string;
    bullets: string[];
  }
> = {
  login: {
    headlineTop: "Welcome back,",
    headlineBottom: "let’s get moving.",
    blurb:
      "Fast login. Strong security. Built for resellers who live in the secondary market.",
    footerTitle: "Security Highlights",
    bullets: [
      "Supabase Auth + enforced RLS",
      "Mandatory admin 2FA",
      "Secure session cookies",
    ],
  },
  register: {
    headlineTop: "Built for resellers",
    headlineBottom: "who move fast.",
    blurb:
      "Mobile-first drops, clean analytics, and an admin experience tuned for people who live in the secondary market every day.",
    footerTitle: "MVP Highlights",
    bullets: [
      "Supabase Auth + Stripe Checkout",
      "Admin dashboard with real metrics",
      "Hardened security and RLS by design",
    ],
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
      {/* Top section */}
      <div>
        {/* Logo + brand name in top-left */}
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-xl bg-black/40 border border-white/10 overflow-hidden">
            <Image
              src="/images/rdk_logo.png"
              alt="Real Deal Kickz logo"
              fill
              sizes="36px"
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-100/90">
            Real Deal Kickz
          </span>
        </div>

        {/* Headline */}
        <h2 className="mt-8 text-3xl lg:text-4xl font-semibold text-white">
          {v.headlineTop}
          <span className="block text-red-300/90">{v.headlineBottom}</span>
        </h2>

        {/* Blurb */}
        <p className="mt-4 max-w-md text-sm text-neutral-200/80">
          {v.blurb}
        </p>
      </div>

      {/* Footer bullets */}
      <div className="mt-10 space-y-2 text-xs text-neutral-300/80">
        <p className="font-medium uppercase tracking-[0.18em] text-neutral-200/80">
          {v.footerTitle}
        </p>
        <ul className="space-y-1.5 text-[11px]">
          {v.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-[3px] inline-block h-1.5 w-1.5 rounded-full bg-red-400/90" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
