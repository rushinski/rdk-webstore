// app/admin/sales/page.tsx
// Redirect to new URL: /admin/transactions
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacySalesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/transactions");
  }, [router]);
  return null;
}
