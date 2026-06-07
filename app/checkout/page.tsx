// app/checkout/page.tsx
import { redirect } from "next/navigation";

import { CheckoutLockedNotice } from "@/components/checkout/CheckoutLockedNotice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreAccessSettings } from "@/lib/store-access/get-store-access-settings";
import { CheckoutGate } from "@/components/checkout/CheckoutGate";

export default async function CheckoutGatePage() {
  const storeAccess = await getStoreAccessSettings();
  if (storeAccess?.settings.checkoutLockEnabled) {
    return <CheckoutLockedNotice message={storeAccess.settings.checkoutLockMessage} />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/checkout/start");
  }

  return <CheckoutGate />;
}
