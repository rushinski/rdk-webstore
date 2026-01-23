// src/components/checkout/ShippingAddressModal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { X, MapPin } from 'lucide-react';
import type { ShippingAddress } from './CheckoutForm';

interface ShippingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: ShippingAddress) => void;
  initialAddress?: ShippingAddress | null;
}

export function ShippingAddressModal({
  isOpen,
  onClose,
  onSave,
  initialAddress,
}: ShippingAddressModalProps) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [address, setAddress] = useState<ShippingAddress>(
    initialAddress || createEmptyAddress()
  );
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAddress(initialAddress || createEmptyAddress());
      setSaveError(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialAddress]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const normalized = normalizeAddress(address);
    if (!isValidAddress(normalized)) {
      setSaveError('Please complete all required fields.');
      return;
    }

    onSave(normalized);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {initialAddress ? 'Edit Shipping Address' : 'Add Shipping Address'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="modal-name" className="block text-sm font-medium text-gray-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="modal-name"
              value={address.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              required
              autoFocus
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="modal-phone" className="block text-sm font-medium text-gray-300 mb-1">
              Phone Number (optional)
            </label>
            <input
              type="tel"
              id="modal-phone"
              value={address.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* Address Line 1 */}
          <div>
            <label htmlFor="modal-line1" className="block text-sm font-medium text-gray-300 mb-1">
              Street Address *
            </label>
            <input
              type="text"
              id="modal-line1"
              value={address.line1}
              onChange={(e) => handleChange('line1', e.target.value)}
              placeholder="123 Main St"
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              required
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label htmlFor="modal-line2" className="block text-sm font-medium text-gray-300 mb-1">
              Apartment, suite, etc. (optional)
            </label>
            <input
              type="text"
              id="modal-line2"
              value={address.line2}
              onChange={(e) => handleChange('line2', e.target.value)}
              placeholder="Apt 4B"
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* City, State, ZIP */}
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-3">
              <label htmlFor="modal-city" className="block text-sm font-medium text-gray-300 mb-1">
                City *
              </label>
              <input
                type="text"
                id="modal-city"
                value={address.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                required
              />
            </div>

            <div className="col-span-1">
              <label htmlFor="modal-state" className="block text-sm font-medium text-gray-300 mb-1">
                State *
              </label>
              <input
                type="text"
                id="modal-state"
                value={address.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="CA"
                maxLength={2}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 uppercase"
                required
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="modal-postalCode" className="block text-sm font-medium text-gray-300 mb-1">
                ZIP Code *
              </label>
              <input
                type="text"
                id="modal-postalCode"
                value={address.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                placeholder="12345"
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                required
              />
            </div>
          </div>

          {/* Country (US only for now) */}
          <div>
            <label htmlFor="modal-country" className="block text-sm font-medium text-gray-300 mb-1">
              Country
            </label>
            <input
              type="text"
              id="modal-country"
              value="United States"
              disabled
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-gray-500 cursor-not-allowed"
            />
          </div>

          {saveError && (
            <div className="text-sm text-red-400">
              {saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-4 sm:p-6 flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-700 text-zinc-300 text-sm rounded hover:border-zinc-500 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition"
          >
            Save Address
          </button>
        </div>
      </div>
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