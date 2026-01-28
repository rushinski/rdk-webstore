// src/components/store/BackToStoreLink.tsx
"use client";

import { useMemo, type MouseEventHandler } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const normalizeStoreHref = (value: string | null) => {
  if (!value) {
    return undefined;
  }
  if (value.startsWith("/store")) {
    return value;
  }
  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("/store") ? decoded : undefined;
  } catch {
    return undefined;
  }
};

export function BackToStoreLink() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");

  const backHref = useMemo(
    () => normalizeStoreHref(fromParam) ?? "/store",
    [fromParam],
  );

  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (backHref !== "/store") {
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
  };

  return (
    <Link
      href={backHref}
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Store
    </Link>
  );
}
