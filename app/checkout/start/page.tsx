import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { CheckoutLockedNotice } from "@/components/checkout/CheckoutLockedNotice";
import { CheckoutStart } from "@/components/checkout/CheckoutStart";
import { getStoreAccessSettings } from "@/lib/store-access/get-store-access-settings";

function CheckoutStartFallback() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
      <p className="text-gray-400">Preparing your checkout...</p>
    </div>
  );
}

export default async function CheckoutStartPage() {
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
