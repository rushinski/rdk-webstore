export const DEFAULT_CHECKOUT_LOCK_MESSAGE =
  "sorry we currently can not accept payments please message @realdealkickzsc on instagram the items you would like to purchase.";

export type StoreAccessSettingsResponse = {
  error?: string;
  settings?: {
    checkoutLockEnabled?: boolean;
    checkoutLockMessage?: string;
  };
};
