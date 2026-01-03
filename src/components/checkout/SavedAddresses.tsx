// src/components/checkout/SavedAddresses.tsx
'use client';

import { useState, useEffect } from 'react';
import { Check, MapPin, Loader2 } from 'lucide-react';
import type { ShippingAddress } from './CheckoutForm';

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
  onSelectAddress: (address: ShippingAddress | null) => void;
  selectedAddressId: string | null;
  onSelectAddressId: (id: string | null) => void;
}

export function SavedAddresses({
  onSelectAddress,
  selectedAddressId,
  onSelectAddressId,
}: SavedAddressesProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await fetch('/api/account/addresses');
        if (response.ok) {
          const data = await response.json();
          setAddresses(data.addresses || []);
        }
      } catch (error) {
        console.error('Failed to fetch addresses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddresses();
  }, []);

  const handleSelectAddress = (address: SavedAddress) => {
    onSelectAddressId(address.id);
    onSelectAddress({
      name: address.name || '',
      phone: address.phone || '',
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postal_code || '',
      country: address.country || 'US',
    });
  };

  const handleUseNewAddress = () => {
    onSelectAddressId(null);
    onSelectAddress(null);
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (addresses.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        Saved Addresses
      </h2>

      <div className="space-y-3">
        {addresses.map((address) => (
          <button
            key={address.id}
            type="button"
            onClick={() => handleSelectAddress(address)}
            className={`w-full text-left p-4 rounded border transition ${
              selectedAddressId === address.id
                ? 'border-red-600 bg-red-600/10'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  selectedAddressId === address.id
                    ? 'border-red-600 bg-red-600'
                    : 'border-zinc-600'
                }`}
              >
                {selectedAddressId === address.id && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{address.name}</p>
                <p className="text-sm text-gray-400">{address.line1}</p>
                {address.line2 && (
                  <p className="text-sm text-gray-400">{address.line2}</p>
                )}
                <p className="text-sm text-gray-400">
                  {address.city}, {address.state} {address.postal_code}
                </p>
                {address.phone && (
                  <p className="text-sm text-gray-500 mt-1">{address.phone}</p>
                )}
              </div>
            </div>
          </button>
        ))}

        <button
          type="button"
          onClick={handleUseNewAddress}
          className={`w-full text-left p-4 rounded border transition ${
            selectedAddressId === null
              ? 'border-red-600 bg-red-600/10'
              : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                selectedAddressId === null
                  ? 'border-red-600 bg-red-600'
                  : 'border-zinc-600'
              }`}
            >
              {selectedAddressId === null && <Check className="w-3 h-3 text-white" />}
            </div>

            <div className="flex-1">
              <p className="text-white font-medium">Use a new address</p>
              <p className="text-sm text-gray-400">Enter a different shipping address</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}