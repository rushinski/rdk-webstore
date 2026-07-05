import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { CheckoutLockedNotice } from "@/components/checkout/CheckoutLockedNotice";
import { CheckoutStart } from "@/components/checkout/CheckoutStart";
import { getStoreAccessSettings } from "@/lib/store-access/get-store-access-settings";

function CheckoutStartFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-text" />
      <p className="text-brand-muted">Preparing your checkout...</p>
    </div>
  );
}

export async function CheckoutStartPageContent() {
  const storeAccess = await getStoreAccessSettings();
  if (storeAccess?.settings.checkoutLockEnabled) {
    return <CheckoutLockedNotice message={storeAccess.settings.checkoutLockMessage} />;
  }

  return (
    <Suspense fallback={<CheckoutStartFallback />}>
      <CheckoutStart />
    </Suspense>
  );
}
