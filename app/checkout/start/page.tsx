import { CheckoutLockedNotice } from "@/components/checkout/CheckoutLockedNotice";
import { CheckoutStart } from "@/components/checkout/CheckoutStart";
import { getStoreAccessSettings } from "@/lib/store-access/get-store-access-settings";

export default async function CheckoutStartPage() {
  const storeAccess = await getStoreAccessSettings();
  if (storeAccess?.settings.checkoutLockEnabled) {
    return <CheckoutLockedNotice message={storeAccess.settings.checkoutLockMessage} />;
  }

  return <CheckoutStart />;
}
