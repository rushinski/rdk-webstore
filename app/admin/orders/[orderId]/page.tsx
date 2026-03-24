// app/admin/orders/[orderId]/page.tsx
// Redirect to new URL: /admin/transactions/[orderId]
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  useEffect(() => {
    router.replace(`/admin/transactions/${orderId}`);
  }, [orderId, router]);

  return null;
}
