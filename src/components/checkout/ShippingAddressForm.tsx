// src/components/checkout/ShippingAddressForm.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { ShippingAddress } from './CheckoutForm';

interface ShippingAddressFormProps {
  onAddressChange: (address: ShippingAddress | null) => void;
  initialAddress: ShippingAddress | null;
}

export function ShippingAddressForm({ onAddressChange, initialAddress }: ShippingAddressFormProps) {
  const initialSignatureRef = useRef<string>('null');
  const savedSignatureRef = useRef<string>('null');
  const [isEditing, setIsEditing] = useState(!initialAddress);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [address, setAddress] = useState<ShippingAddress>(
    initialAddress || createEmptyAddress()
  );

  useEffect(() => {
    const signature = buildAddressSignature(initialAddress);
    if (signature === initialSignatureRef.current) return;

    initialSignatureRef.current = signature;
    savedSignatureRef.current = signature;

    if (initialAddress) {
      setAddress(normalizeAddress(initialAddress));
      setIsEditing(false);
      setSaveError(null);
      return;
    }

    setAddress(createEmptyAddress());
    setIsEditing(true);
    setSaveError(null);
  }, [initialAddress]);

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const normalized = normalizeAddress(address);
    if (!isValidAddress(normalized)) {
      setSaveError('Please complete all required fields.');
      return;
    }

    const signature = buildAddressSignature(normalized);
    if (signature !== savedSignatureRef.current) {
      onAddressChange(normalized);
      savedSignatureRef.current = signature;
    }

    setAddress(normalized);
    setIsEditing(false);
    setSaveError(null);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSaveError(null);
  };

  const handleCancel = () => {
    if (initialAddress) {
      setAddress(normalizeAddress(initialAddress));
      setIsEditing(false);
      setSaveError(null);
      return;
    }

    setAddress(createEmptyAddress());
    setSaveError(null);
  };

  const inputDisabled = !isEditing;

  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Shipping Address
        </h2>
        {!isEditing && initialAddress && (
          <button
            type="button"
            onClick={handleEdit}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Edit address
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            value={address.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={inputDisabled}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-70 disabled:cursor-not-allowed"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
            Phone Number (optional)
          </label>
          <input
            type="tel"
            id="phone"
            value={address.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            disabled={inputDisabled}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </div>

        {/* Address Line 1 */}
        <div>
          <label htmlFor="line1" className="block text-sm font-medium text-gray-300 mb-1">
            Street Address *
          </label>
          <input
            type="text"
            id="line1"
            value={address.line1}
            onChange={(e) => handleChange('line1', e.target.value)}
            placeholder="123 Main St"
            disabled={inputDisabled}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-70 disabled:cursor-not-allowed"
            required
          />
        </div>

        {/* Address Line 2 */}
        <div>
          <label htmlFor="line2" className="block text-sm font-medium text-gray-300 mb-1">
            Apartment, suite, etc. (optional)
          </label>
          <input
            type="text"
            id="line2"
            value={address.line2}
            onChange={(e) => handleChange('line2', e.target.value)}
            placeholder="Apt 4B"
            disabled={inputDisabled}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </div>

        {/* City, State, ZIP */}
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-3">
            <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-1">
              City *
            </label>
            <input
              type="text"
              id="city"
              value={address.city}
              onChange={(e) => handleChange('city', e.target.value)}
              disabled={inputDisabled}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-70 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div className="col-span-1">
            <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-1">
              State *
            </label>
            <input
              type="text"
              id="state"
              value={address.state}
              onChange={(e) => handleChange('state', e.target.value)}
              placeholder="CA"
              maxLength={2}
              disabled={inputDisabled}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-300 mb-1">
              ZIP Code *
            </label>
            <input
              type="text"
              id="postalCode"
              value={address.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              placeholder="12345"
              disabled={inputDisabled}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-70 disabled:cursor-not-allowed"
              required
            />
          </div>
        </div>

        {/* Country (US only for now) */}
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-1">
            Country
          </label>
          <input
            type="text"
            id="country"
            value="United States"
            disabled
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-gray-500 cursor-not-allowed"
          />
        </div>
      </div>

      {saveError && (
        <div className="mt-4 text-sm text-red-400">
          {saveError}
        </div>
      )}

      {isEditing && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition"
          >
            Save address
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-zinc-700 text-zinc-300 text-sm rounded hover:border-zinc-500 hover:text-white transition"
          >
            {initialAddress ? 'Cancel' : 'Reset'}
          </button>
        </div>
      )}
    </div>
  );
}

function createEmptyAddress(): ShippingAddress {
  return {
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  };
}

function normalizeAddress(address: ShippingAddress): ShippingAddress {
  return {
    name: address.name.trim(),
    phone: address.phone.trim(),
    line1: address.line1.trim(),
    line2: address.line2?.trim() ?? '',
    city: address.city.trim(),
    state: address.state.trim().toUpperCase(),
    postalCode: address.postalCode.trim(),
    country: address.country.trim().toUpperCase(),
  };
}

function isValidAddress(address: ShippingAddress): boolean {
  return (
    address.name.trim() !== '' &&
    address.line1.trim() !== '' &&
    address.city.trim() !== '' &&
    address.state.trim() !== '' &&
    address.postalCode.trim() !== ''
  );
}

function buildAddressSignature(address: ShippingAddress | null): string {
  if (!address) return 'null';
  const normalized = normalizeAddress(address);
  return [
    normalized.name,
    normalized.phone,
    normalized.line1,
    normalized.line2 ?? '',
    normalized.city,
    normalized.state,
    normalized.postalCode,
    normalized.country,
  ].join('|');
}
