import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { brandTheme } from "@/config/brand/solesneakers";

export function AuthPageShell({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-screen bg-brand-page px-4 py-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="flex justify-center">
          <Image
            src={brandTheme.logo.src}
            alt={brandTheme.logo.alt}
            width={176}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <div className="mt-10 border border-brand-border bg-brand-surface px-6 py-8">
          <h1 className="text-center text-2xl font-black uppercase tracking-[0.1em] text-brand-text">
            {title}
          </h1>
          <p className="mt-2 text-center text-sm text-brand-muted">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
