// app/auth/register/page.tsx
import AuthCard from "@/components/auth/ui/AuthCard";
import { RegisterForm } from "@/components/auth/register/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Left brand panel (desktop only) */}
        <aside className="relative hidden md:flex md:w-5/12 lg:w-1/2 overflow-hidden bg-gradient-to-br from-red-700 via-black to-neutral-900">
          <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-red-500/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-red-900/50 blur-3xl" />

          <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-10 lg:px-14 lg:py-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-200 border border-white/10">
                <span className="h-6 w-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-[13px] font-bold">
                  R
                </span>
                Real Deal Kickz
              </div>

              <h2 className="mt-6 text-3xl lg:text-4xl font-semibold text-white">
                Built for resellers
                <span className="block text-red-300/90">who move fast.</span>
              </h2>

              <p className="mt-4 max-w-md text-sm text-neutral-200/80">
                Mobile-first drops, clean analytics, and an admin experience tuned for
                people who live in the secondary market every day.
              </p>
            </div>

            <div className="mt-10 space-y-2 text-xs text-neutral-300/80">
              <p className="font-medium uppercase tracking-[0.18em] text-neutral-200/80">
                MVP Highlights
              </p>
              <ul className="space-y-1.5 text-[11px]">
                <li>• Supabase Auth + Stripe Checkout</li>
                <li>• Admin dashboard with real metrics</li>
                <li>• Hardened security and RLS by design</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Right form panel */}
        <main className="flex w-full md:w-7/12 lg:w-1/2 items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <AuthCard className="bg-white dark:bg-neutral-950">
            <RegisterForm />
          </AuthCard>
        </main>
      </div>
    </div>
  );
}
