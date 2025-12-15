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
    headlineBottom: "pick up where you left off.",
    blurb:
      "Check your orders, track new drops, and secure pairs before they’re gone. Thousands of sneakerheads already trust Real Deal Kickz.",
    footerTitle: "Why customers log back in",
    bullets: [
      "Faster checkout with your saved address and payment details",
      "Your cart and favorites are exactly where you left them",
      "Stay in the loop on new drops and restocks",
    ],
  },
  register: {
    headlineTop: "Join thousands of buyers",
    headlineBottom: "who shop with confidence.",
    blurb:
      "Verified kicks, fast communication, and a reseller trusted by thousands of customers with hundreds of positive reviews. Create an account to never miss the next drop.",
    footerTitle: "Why people sign up",
    bullets: [
      "Save your address and card once for quick, hassle-free checkout",
      "Keep your cart and wishlist synced every time you come back",
      "Be first to hear about new drops, restocks, and exclusive offers",
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
              src="/images/rdk_logo.png"
              alt="Real Deal Kickz logo"
              fill
              sizes="36px"
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-100/90">
            Realdealkickz
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
        <p className="mt-4 max-w-md text-sm text-neutral-200/80">
          {v.blurb}
        </p>
      </div>

      {/* Footer bullets */}
      <div className="relative mt-10 max-w-sm">
        <div className="border-t border-white/10 pt-4 backdrop-blur-sm bg-black/10 rounded-xl px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-200/80">
            {v.footerTitle}
          </p>
          <ul className="mt-2 space-y-1.5 text-[11px] text-neutral-300/85">
            {v.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-[5px] inline-block h-1.5 w-1.5 rounded-full bg-red-400/90 shadow-sm shadow-red-900/60" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
