import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { brandTheme } from "@/config/brand/solesneakers";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { isAdminRole } from "@/config/constants/roles";
import { getServerSession } from "@/lib/auth/session";
import { getStoreAccessSettings } from "@/lib/store-access/get-store-access-settings";

import { UnlockTimer } from "./unlock-timer";

export const dynamic = "force-dynamic";

function formatUnlock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default async function LockedPage(props: {
  searchParams?: Promise<{ next?: string }> | { next?: string };
}) {
  const sp = props.searchParams ? await Promise.resolve(props.searchParams) : undefined;
  const next = sp?.next || "/";
  const session = await getServerSession();
  if (session && isAdminRole(session.role)) {
    redirect(next);
  }

  const storeAccess = await getStoreAccessSettings();
  const unlockAtIso = storeAccess?.settings.siteUnlockAt ?? null;
  const unlockFullDate = unlockAtIso ? formatUnlock(unlockAtIso) : null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden border border-brand-border bg-brand-surface shadow-xl">
        <div className="relative flex min-h-[calc(100vh-12rem)] items-center px-6 py-14">
          <div className="w-full px-2 text-center sm:px-8">
            <div className="mb-8 flex items-center justify-center gap-3">
              <div className="relative h-11 w-44 shrink-0">
                <Image
                  src={brandTheme.logo.src}
                  alt={brandTheme.logo.alt}
                  fill
                  sizes="176px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-brand-text sm:text-4xl">
              The site is currently locked
            </h1>
            <p className="mt-3 text-sm text-brand-muted sm:text-base">
              We&apos;re temporarily closed to the public while we prepare the site.
            </p>

            <div className="mt-4 flex flex-col items-center gap-1">
              <p className="text-sm text-brand-muted sm:text-base">
                The site unlocks in:{" "}
                <span className="font-mono font-bold text-brand-text">
                  {unlockAtIso ? <UnlockTimer unlockAtIso={unlockAtIso} /> : "soon"}
                </span>
              </p>
              {unlockFullDate ? (
                <p className="text-xs italic text-brand-muted">{unlockFullDate}</p>
              ) : null}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href={`/auth/login?next=${encodeURIComponent(next)}`}
                className={buttonStyles.primary}
              >
                If you&apos;re an admin, sign in here
              </Link>

              <p className="text-xs text-brand-muted">
                Not an admin? The site will refresh automatically at drop time.
              </p>
            </div>

            <div className="mt-10 text-[11px] uppercase tracking-widest text-brand-muted">
              Curated footwear / secure checkout / fast shipping
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
