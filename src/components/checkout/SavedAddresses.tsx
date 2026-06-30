"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin, Plus } from "lucide-react";

import { ShippingAddressModal } from "./ShippingAddressModal";
import type { ShippingAddress } from "./CheckoutForm";

interface SavedAddress {
  id: string;
  name: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

interface SavedAddressesProps {
  onSelectAddress: (address: ShippingAddress) => void;
  selectedAddressId: string | null;
  onSelectAddressId: (id: string | null) => void;
  isGuest?: boolean;
}

const GUEST_ADDRESS_STORAGE_KEY = "rdk_guest_shipping_address_v1";

function toShippingAddress(a: SavedAddress): ShippingAddress {
  return {
    name: a.name || "",
    phone: a.phone || "",
    line1: a.line1 || "",
    line2: a.line2 || "",
    city: a.city || "",
    state: a.state || "",
    postal_code: a.postal_code || "",
    country: a.country || "US",
  };
}

function toApiPayload(address: ShippingAddress) {
  return {
    name: address.name?.trim() || null,
    phone: address.phone?.trim() || null,
    line1: address.line1.trim(),
    line2: address.line2?.trim() ? address.line2.trim() : null,
    city: address.city.trim(),
    state: address.state.trim().toUpperCase(),
    postal_code: address.postal_code.trim(),
    country: (address.country || "US").trim().toUpperCase(),
  };
}

export function SavedAddresses({
  onSelectAddress,
  selectedAddressId,
  onSelectAddressId,
  isGuest = false,
}: SavedAddressesProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [guestAddress, setGuestAddress] = useState<ShippingAddress | null>(null);
  const didInitGuestRef = useRef(false);

  useEffect(() => {
    if (isGuest) {
      if (didInitGuestRef.current) {
        return;
      }
      didInitGuestRef.current = true;

      try {
        const raw = sessionStorage.getItem(GUEST_ADDRESS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ShippingAddress;
          setGuestAddress((prev) => {
            const prevSig = prev ? JSON.stringify(prev) : "";
            const nextSig = JSON.stringify(parsed);
            return prevSig === nextSig ? prev : parsed;
          });

          if (selectedAddressId !== "guest-address") {
            onSelectAddressId("guest-address");
            onSelectAddress(parsed);
          }
        }
      } catch {
        // ignore
      }

      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    (async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/account/addresses", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json().catch(() => null);
          setAddresses(data?.addresses || []);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [isGuest]);

  const handleSelectAddress = (address: SavedAddress) => {
    onSelectAddressId(address.id);
    onSelectAddress(toShippingAddress(address));
  };

  const handleSelectGuestAddress = () => {
    if (!guestAddress) {
      return;
    }
    onSelectAddressId("guest-address");
    onSelectAddress(guestAddress);
  };

  const handleAddNewAddress = () => {
    setEditingAddress(isGuest ? guestAddress : null);
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (address: ShippingAddress) => {
    if (isGuest) {
      setGuestAddress(address);
      onSelectAddressId("guest-address");
      onSelectAddress(address);
      try {
        sessionStorage.setItem(GUEST_ADDRESS_STORAGE_KEY, JSON.stringify(address));
      } catch {
        // ignore
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiPayload(address)),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save address");
      }

      const nextAddresses: SavedAddress[] = data?.addresses || [];
      setAddresses(nextAddresses);

      const saved = nextAddresses.find(
        (a) =>
          (a.line1 || "").trim().toLowerCase() === address.line1.trim().toLowerCase() &&
          (a.postal_code || "").trim() === address.postal_code.trim(),
      );

      if (saved) {
        onSelectAddressId(saved.id);
        onSelectAddress(toShippingAddress(saved));
      } else if (nextAddresses[0]) {
        onSelectAddressId(nextAddresses[0].id);
        onSelectAddress(toShippingAddress(nextAddresses[0]));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="border border-brand-border bg-brand-surface p-5 sm:p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-brand-muted" />
        </div>
      </div>
    );
  }

  const guestSelected = isGuest && selectedAddressId === "guest-address";
  const cardBaseClass =
    "w-full border p-4 text-left transition-colors hover:border-brand-text";

  return (
    <>
      <div className="border border-brand-border bg-brand-surface p-5 shadow-[0_20px_60px_rgba(17,17,17,0.06)] sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold uppercase tracking-[0.08em] text-brand-text sm:text-lg">
          <MapPin className="h-5 w-5" />
          {isGuest ? "Shipping Address" : "Saved Addresses"}
        </h2>

        <div className="space-y-3">
          {isGuest && guestAddress && (
            <button
              type="button"
              onClick={handleSelectGuestAddress}
              className={`${cardBaseClass} ${
                guestSelected
                  ? "border-brand-text bg-brand-page"
                  : "border-brand-border bg-brand-surface"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border ${
                    guestSelected
                      ? "border-brand-text bg-brand-text text-brand-surface"
                      : "border-brand-border text-transparent"
                  }`}
                >
                  {guestSelected && <Check className="h-3 w-3" />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-brand-text">{guestAddress.name}</p>
                  <p className="text-sm text-brand-muted">{guestAddress.line1}</p>
                  {guestAddress.line2 && (
                    <p className="text-sm text-brand-muted">{guestAddress.line2}</p>
                  )}
                  <p className="text-sm text-brand-muted">
                    {guestAddress.city}, {guestAddress.state} {guestAddress.postal_code}
                  </p>
                  {guestAddress.phone && (
                    <p className="mt-1 text-sm text-brand-muted">{guestAddress.phone}</p>
                  )}
                </div>
              </div>
            </button>
          )}

          {!isGuest &&
            addresses.map((address) => {
              const isSelected = selectedAddressId === address.id;
              return (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => handleSelectAddress(address)}
                  className={`${cardBaseClass} ${
                    isSelected
                      ? "border-brand-text bg-brand-page"
                      : "border-brand-border bg-brand-surface"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border ${
                        isSelected
                          ? "border-brand-text bg-brand-text text-brand-surface"
                          : "border-brand-border text-transparent"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-brand-text">{address.name}</p>
                      <p className="text-sm text-brand-muted">{address.line1}</p>
                      {address.line2 && (
                        <p className="text-sm text-brand-muted">{address.line2}</p>
                      )}
                      <p className="text-sm text-brand-muted">
                        {address.city}, {address.state} {address.postal_code}
                      </p>
                      {address.phone && (
                        <p className="mt-1 text-sm text-brand-muted">{address.phone}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

          <button
            type="button"
            onClick={handleAddNewAddress}
            className="flex w-full items-center justify-center gap-2 border border-dashed border-brand-border bg-brand-page p-4 text-brand-text transition-colors hover:border-brand-text"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium uppercase tracking-[0.08em]">
              {isGuest
                ? guestAddress
                  ? "Edit shipping address"
                  : "Add shipping address"
                : addresses.length > 0
                  ? "Add another shipping address"
                  : "Add a shipping address"}
            </span>
          </button>
        </div>
      </div>

      <ShippingAddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(address) => {
          void handleSaveAddress(address);
        }}
        initialAddress={editingAddress}
      />
    </>
  );
}
