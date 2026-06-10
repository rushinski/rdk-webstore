// app/checkout/page.tsx
import { redirect } from "next/navigation";

import { CheckoutLockedNotice } from "@/components/checkout/CheckoutLockedNotice";
import { getServerSession } from "@/lib/auth/session";
import { getStoreAccessSettings } from "@/lib/store-access/get-store-access-settings";
import { CheckoutGate } from "@/components/checkout/CheckoutGate";

export default async function CheckoutGatePage() {
  const storeAccess = await getStoreAccessSettings();
  if (storeAccess?.settings.checkoutLockEnabled) {
    return <CheckoutLockedNotice message={storeAccess.settings.checkoutLockMessage} />;
  }

  const session = await getServerSession();
  const user = session?.user ?? null;

  if (user) {
    redirect("/checkout/start");
  }

  return <CheckoutGate />;
}
