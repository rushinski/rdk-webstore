// src/components/checkout/ShippingAddressForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import type { ShippingAddress } from './CheckoutForm';

interface ShippingAddressFormProps {
  onAddressChange: (address: ShippingAddress | null) => void;
  initialAddress: ShippingAddress | null;
}

export function ShippingAddressForm({ onAddressChange, initialAddress }: ShippingAddressFormProps) {
  const [address, setAddress] = useState<ShippingAddress>(
    initialAddress || {
      name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    }
  );

  useEffect(() => {
    // Validate and notify parent
    const isValid =
      address.name.trim() !== '' &&
      address.phone.trim() !== '' &&
      address.line1.trim() !== '' &&
      address.city.trim() !== '' &&
      address.state.trim() !== '' &&
      address.postalCode.trim() !== '';

    onAddressChange(isValid ? address : null);
  }, [address, onAddressChange]);

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        Shipping Address
      </h2>

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
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone"
            value={address.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            required
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
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
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
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
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
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
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
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 uppercase"
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
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
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
    </div>
  );
}