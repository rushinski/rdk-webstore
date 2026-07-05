import Link from "next/link";

import { AccountProfile } from "@/components/account/AccountProfile";
import { requireUser } from "@/lib/auth/session";

export async function AccountPageContent() {
  let session;

  try {
    session = await requireUser();
  } catch {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-brand-muted">Account</p>
        <h1 className="mb-4 mt-3 text-3xl font-black uppercase tracking-[0.08em] text-brand-text">
          Sign in to view your account
        </h1>
        <p className="mb-8 text-brand-muted">
          Access your profile, shipping info, and order history.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/auth/login"
            className="border border-brand-text bg-brand-text px-8 py-3 text-sm font-bold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="border border-brand-border bg-brand-surface px-8 py-3 text-sm font-bold uppercase tracking-[0.08em] text-brand-text transition-colors hover:border-brand-text hover:bg-brand-page"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return <AccountProfile userEmail={session.user.email} />;
}
