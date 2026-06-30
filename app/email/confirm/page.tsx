import Link from "next/link";

import { buttonStyles } from "@/components/ui/buttonStyles";

const STATUS_CONTENT: Record<string, { title: string; message: string }> = {
  success: {
    title: "Subscription confirmed",
    message: "You’re all set to receive newsletter and product alerts from solesneakers.",
  },
  already: {
    title: "Already subscribed",
    message: "This email is already subscribed to updates.",
  },
  expired: {
    title: "Link expired",
    message: "This confirmation link expired. Please sign up again to get a fresh link.",
  },
  invalid: {
    title: "Invalid link",
    message: "That confirmation link isn’t valid. Please try again.",
  },
  error: {
    title: "Something went wrong",
    message: "We couldn’t confirm your subscription. Please try again.",
  },
};

type SearchParams = { status?: string | string[] };

export default async function EmailConfirmPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const raw = resolved?.status;
  const status = Array.isArray(raw) ? raw[0] : (raw ?? "success");
  const content = STATUS_CONTENT[status] ?? STATUS_CONTENT.success;

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
        solesneakers
      </p>
      <h1 className="mt-4 text-4xl font-bold text-brand-text">{content.title}</h1>
      <p className="mt-4 text-brand-muted">{content.message}</p>
      <Link href="/" className={`${buttonStyles.primary} mt-8`}>
        Back to home
      </Link>
    </div>
  );
}
