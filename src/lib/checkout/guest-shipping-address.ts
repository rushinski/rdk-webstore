// src/lib/checkout/guest-shipping-address.ts
export const GUEST_ADDRESS_STORAGE_KEY = "rdk_guest_shipping_address_v1";

export function clearGuestShippingAddress() {
  try {
    sessionStorage.removeItem(GUEST_ADDRESS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function setGuestShippingAddress(address: unknown) {
  try {
    sessionStorage.setItem(GUEST_ADDRESS_STORAGE_KEY, JSON.stringify(address));
  } catch {
    // ignore
  }
}

export function getGuestShippingAddress<T = any>(): T | null {
  try {
    const raw = sessionStorage.getItem(GUEST_ADDRESS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
