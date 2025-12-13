// components/auth/ui/AuthLeftPanel.tsx
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
    blurb: "Fast login. Strong security. Built for resellers who live in the secondary market.",
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

export default function AuthLeftPanel({ variant = "login" }: { variant?: AuthLeftPanelVariant }) {
  const v = COPY[variant];

  return (
    <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-10 lg:px-14 lg:py-12">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-200 border border-white/10">
          <span className="h-6 w-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-[13px] font-bold">
            R
          </span>
          Real Deal Kickz
        </div>

        <h2 className="mt-6 text-3xl lg:text-4xl font-semibold text-white">
          {v.headlineTop}
          <span className="block text-red-300/90">{v.headlineBottom}</span>
        </h2>

        <p className="mt-4 max-w-md text-sm text-neutral-200/80">{v.blurb}</p>
      </div>

      <div className="mt-10 space-y-2 text-xs text-neutral-300/80">
        <p className="font-medium uppercase tracking-[0.18em] text-neutral-200/80">
          {v.footerTitle}
        </p>
        <ul className="space-y-1.5 text-[11px]">
          {v.bullets.map((b) => (
            <li key={b}>• {b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
