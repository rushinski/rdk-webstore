// src/components/account/AccountProfile.tsx
'use client';

import { useState, useEffect } from 'react';
import type { ShippingProfile } from '@/types/views/shipping'; 
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { logError } from '@/lib/log';

export function AccountProfile({ userEmail }: { userEmail: string }) {
  const [profile, setProfile] = useState<Partial<ShippingProfile>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });

  useEffect(() => {
    loadProfile();
    loadOrders();
    loadAddresses();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/account/shipping');
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      logError(error, { layer: "frontend", event: "account_load_profile" });
    }
  };

  const loadOrders = async () => {
    setIsOrdersLoading(true);
    try {
      const response = await fetch('/api/account/orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      logError(error, { layer: "frontend", event: "account_load_orders" });
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/account/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setMessage('Shipping info saved successfully!');
      } else {
        setMessage('Failed to save shipping info');
      }
    } catch (error) {
      setMessage('Error saving shipping info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMessage('Failed to change password: ' + error.message);
      } else {
        setMessage('Password changed successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setMessage('Error changing password');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAddresses = async () => {
    setIsAddressesLoading(true);
    try {
      const response = await fetch('/api/account/addresses');
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (error) {
      logError(error, { layer: "frontend", event: "account_load_addresses" });
    } finally {
      setIsAddressesLoading(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddressSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressForm),
      });

      if (!response.ok) {
        setMessage('Failed to save address');
        return;
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
      setAddressForm({
        name: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
      });
      setMessage('Address saved successfully!');
    } catch (error) {
      setMessage('Error saving address');
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    setMessage('');
    try {
      const response = await fetch(`/api/account/addresses/${addressId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        setMessage('Failed to remove address');
        return;
      }

      setAddresses((prev) => prev.filter((address) => address.id !== addressId));
    } catch (error) {
      setMessage('Error removing address');
    }
  };

  const getTrackingUrl = (carrier?: string | null, trackingNumber?: string | null) => {
    if (!trackingNumber) return null;
    const normalized = (carrier ?? '').toLowerCase();
    const encodedTracking = encodeURIComponent(trackingNumber);

    if (normalized.includes('ups')) {
      return `https://www.ups.com/track?loc=en_US&tracknum=${encodedTracking}`;
    }
    if (normalized.includes('usps')) {
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodedTracking}`;
    }
    if (normalized.includes('fedex') || normalized.includes('fed ex')) {
      return `https://www.fedex.com/fedextrack/?trknbr=${encodedTracking}`;
    }
    if (normalized.includes('dhl')) {
      return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodedTracking}`;
    }

    return null;
  };

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      setMessage('Failed to log out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>

      {message && (
        <div className={`mb-6 p-4 rounded ${
          message.includes('success') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
        }`}>
          {message}
        </div>
      )}

      {/* Email (Read-only) */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Email</h2>
        <p className="text-gray-400">{userEmail}</p>
        <p className="text-gray-500 text-sm mt-2">Email changes are not currently supported</p>
      </div>

      {/* Shipping Info */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Shipping Information</h2>
        <form onSubmit={handleSaveShipping} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Full Name</label>
            <input
              type="text"
              value={profile.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Address Line 1</label>
            <input
              type="text"
              value={profile.address_line1 || ''}
              onChange={(e) => setProfile({ ...profile, address_line1: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Address Line 2</label>
            <input
              type="text"
              value={profile.address_line2 || ''}
              onChange={(e) => setProfile({ ...profile, address_line2: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">City</label>
              <input
                type="text"
                value={profile.city || ''}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">State</label>
              <input
                type="text"
                value={profile.state || ''}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Postal Code</label>
              <input
                type="text"
                value={profile.postal_code || ''}
                onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Country</label>
              <input
                type="text"
                value={profile.country || ''}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
          >
            {isLoading ? 'Saving...' : 'Save Shipping Info'}
          </button>
        </form>
      </div>

      {/* Saved Addresses */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-xl font-semibold text-white">Saved Addresses</h2>
          <span className="text-xs text-zinc-500">Save multiple addresses for faster checkout.</span>
        </div>

        {isAddressesLoading ? (
          <div className="text-gray-400 mb-6">Loading addresses...</div>
        ) : addresses.length === 0 ? (
          <div className="text-gray-400 mb-6">No saved addresses yet.</div>
        ) : (
          <div className="space-y-3 mb-6">
            {addresses.map((address) => (
              <div key={address.id} className="border border-zinc-800/70 rounded p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-sm text-zinc-300">
                    <div className="text-white font-semibold">{address.name || 'Saved Address'}</div>
                    <div>{address.line1}</div>
                    {address.line2 && <div>{address.line2}</div>}
                    <div>
                      {address.city}, {address.state} {address.postal_code}
                    </div>
                    <div>{address.country}</div>
                    {address.phone && <div className="text-zinc-500">{address.phone}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(address.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSaveAddress} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Full Name</label>
            <input
              type="text"
              value={addressForm.name}
              onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Phone</label>
            <input
              type="tel"
              value={addressForm.phone}
              onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Address Line 1</label>
            <input
              type="text"
              required
              value={addressForm.line1}
              onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Address Line 2</label>
            <input
              type="text"
              value={addressForm.line2}
              onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">City</label>
              <input
                type="text"
                required
                value={addressForm.city}
                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">State</label>
              <input
                type="text"
                required
                value={addressForm.state}
                onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Postal Code</label>
              <input
                type="text"
                required
                value={addressForm.postal_code}
                onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Country</label>
              <input
                type="text"
                required
                value={addressForm.country}
                onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isAddressSaving}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
          >
            {isAddressSaving ? 'Saving...' : 'Add Address'}
          </button>
        </form>
      </div>

      {/* Order History */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Order History</h2>
        {isOrdersLoading ? (
          <div className="text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-gray-400">No orders yet.</div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const trackingUrl = getTrackingUrl(order.shipping_carrier, order.tracking_number);
              const showTracking = order.fulfillment === 'ship' && order.tracking_number;

              return (
              <div key={order.id} className="border border-zinc-800/70 rounded p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="text-white font-semibold">Order #{order.id.slice(0, 8)}</div>
                  <div className="text-gray-400 text-sm">{new Date(order.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-gray-400 text-sm">Status: {order.status}</span>
                  <span className="text-white font-semibold">
                    ${Number(order.total ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  {(order.items || []).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">
                        {item.product?.title_display ??
                          `${item.product?.brand ?? ""} ${item.product?.name ?? ""}`.trim()}
                        {item.variant?.size_label ? ` (${item.variant.size_label})` : ''}
                      </span>
                      <span className="text-gray-400">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                {showTracking && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="text-zinc-400">
                      Tracking: {order.shipping_carrier ? `${order.shipping_carrier} ` : ""}
                      <span className="text-zinc-200">{order.tracking_number}</span>
                    </div>
                    {trackingUrl ? (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:underline"
                      >
                        Track shipment
                      </a>
                    ) : null}
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
          >
            {isLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Sign out</h2>
        <p className="text-gray-400 text-sm mb-4">
          You can sign back in anytime to view your orders and account details.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isSigningOut}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-700 text-white font-semibold px-6 py-2 transition cursor-pointer"
        >
          {isSigningOut ? 'Signing out...' : 'Logout'}
        </button>
      </div>
    </div>
  );
}
