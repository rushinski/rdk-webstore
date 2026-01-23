'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, MapPin, Loader2, Plus } from 'lucide-react';
import type { ShippingAddress } from './CheckoutForm';
import { ShippingAddressModal } from './ShippingAddressModal';

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

const GUEST_ADDRESS_STORAGE_KEY = 'rdk_guest_shipping_address_v1';

function toShippingAddress(a: SavedAddress): ShippingAddress {
  return {
    name: a.name || '',
    phone: a.phone || '',
    line1: a.line1 || '',
    line2: a.line2 || '',
    city: a.city || '',
    state: a.state || '',
    postalCode: a.postal_code || '',
    country: a.country || 'US',
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
    postal_code: address.postalCode.trim(),
    country: (address.country || 'US').trim().toUpperCase(),
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

  // Guest-only state so we can render a “selected” card
  const [guestAddress, setGuestAddress] = useState<ShippingAddress | null>(null);

  // ✅ Prevent “Maximum update depth exceeded” for guest restore flow
  const didInitGuestRef = useRef(false);

  useEffect(() => {
    if (isGuest) {
      if (didInitGuestRef.current) return;
      didInitGuestRef.current = true;

      try {
        const raw = sessionStorage.getItem(GUEST_ADDRESS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ShippingAddress;

          // Only update if it actually changes
          setGuestAddress((prev) => {
            const prevSig = prev ? JSON.stringify(prev) : '';
            const nextSig = JSON.stringify(parsed);
            return prevSig === nextSig ? prev : parsed;
          });

          // Only select if not already selected
          if (selectedAddressId !== 'guest-address') {
            onSelectAddressId('guest-address');
            onSelectAddress(parsed);
          }
        }
      } catch {
        // ignore
      }

      setIsLoading(false);
      return;
    }

    // Logged-in: fetch addresses
    const controller = new AbortController();

    (async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/account/addresses', {
          cache: 'no-store',
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
    // Intentionally NOT including callbacks here; they are often unstable from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  const handleSelectAddress = (address: SavedAddress) => {
    onSelectAddressId(address.id);
    onSelectAddress(toShippingAddress(address));
  };

  const handleSelectGuestAddress = () => {
    if (!guestAddress) return;
    onSelectAddressId('guest-address');
    onSelectAddress(guestAddress);
  };

  const handleAddNewAddress = () => {
    // Guest: prefill if they already have one so “Add” acts like “Edit”
    if (isGuest) {
      setEditingAddress(guestAddress);
    } else {
      setEditingAddress(null);
    }
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (address: ShippingAddress) => {
    // ✅ Guest: store locally + select + render
    if (isGuest) {
      setGuestAddress(address);
      onSelectAddressId('guest-address');
      onSelectAddress(address);
      try {
        sessionStorage.setItem(GUEST_ADDRESS_STORAGE_KEY, JSON.stringify(address));
      } catch {
        // ignore
      }
      return;
    }

    // ✅ Logged-in: persist to DB via your existing route
    setIsLoading(true);
    try {
      const response = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toApiPayload(address)),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save address');
      }

      const nextAddresses: SavedAddress[] = data?.addresses || [];
      setAddresses(nextAddresses);

      // Select the saved address (match by line1 + postal_code)
      const saved = nextAddresses.find(
        (a) =>
          (a.line1 || '').trim().toLowerCase() === address.line1.trim().toLowerCase() &&
          (a.postal_code || '').trim() === address.postalCode.trim(),
      );

      if (saved) {
        onSelectAddressId(saved.id);
        onSelectAddress(toShippingAddress(saved));
      } else {
        // fallback: select first result if exists
        if (nextAddresses[0]) {
          onSelectAddressId(nextAddresses[0].id);
          onSelectAddress(toShippingAddress(nextAddresses[0]));
        }
      }
    } catch (e) {
      // You can surface this via toast/error UI if you want
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-5 sm:p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  const guestSelected = isGuest && selectedAddressId === 'guest-address';

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          {isGuest ? 'Shipping Address' : 'Saved Addresses'}
        </h2>

        <div className="space-y-3">
          {/* Guest selected address card */}
          {isGuest && guestAddress && (
            <button
              type="button"
              onClick={handleSelectGuestAddress}
              className={`w-full text-left p-4 rounded border transition ${
                guestSelected ? 'border-red-600 bg-red-600/10' : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    guestSelected ? 'border-red-600 bg-red-600' : 'border-zinc-600'
                  }`}
                >
                  {guestSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{guestAddress.name}</p>
                  <p className="text-sm text-gray-400">{guestAddress.line1}</p>
                  {guestAddress.line2 && <p className="text-sm text-gray-400">{guestAddress.line2}</p>}
                  <p className="text-sm text-gray-400">
                    {guestAddress.city}, {guestAddress.state} {guestAddress.postalCode}
                  </p>
                  {guestAddress.phone && <p className="text-sm text-gray-500 mt-1">{guestAddress.phone}</p>}
                </div>
              </div>
            </button>
          )}

          {/* Logged-in saved addresses */}
          {!isGuest &&
            addresses.map((address) => (
              <button
                key={address.id}
                type="button"
                onClick={() => handleSelectAddress(address)}
                className={`w-full text-left p-4 rounded border transition ${
                  selectedAddressId === address.id ? 'border-red-600 bg-red-600/10' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      selectedAddressId === address.id ? 'border-red-600 bg-red-600' : 'border-zinc-600'
                    }`}
                  >
                    {selectedAddressId === address.id && <Check className="w-3 h-3 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{address.name}</p>
                    <p className="text-sm text-gray-400">{address.line1}</p>
                    {address.line2 && <p className="text-sm text-gray-400">{address.line2}</p>}
                    <p className="text-sm text-gray-400">
                      {address.city}, {address.state} {address.postal_code}
                    </p>
                    {address.phone && <p className="text-sm text-gray-500 mt-1">{address.phone}</p>}
                  </div>
                </div>
              </button>
            ))}

          <button
            type="button"
            onClick={handleAddNewAddress}
            className="w-full p-4 rounded border border-dashed border-zinc-700 hover:border-red-600 hover:bg-red-600/5 transition flex items-center justify-center gap-2 text-gray-400 hover:text-red-400"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">
              {isGuest
                ? guestAddress
                  ? 'Edit shipping address'
                  : 'Add shipping address'
                : addresses.length > 0
                  ? 'Add another shipping address'
                  : 'Add a shipping address'}
            </span>
          </button>
        </div>
      </div>

      <ShippingAddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAddress}
        initialAddress={editingAddress}
      />
    </>
  );
}
