// src/components/account/AccountProfile.tsx
'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { ShippingProfile } from '@/types/views/shipping'; 
import { logError } from '@/lib/log';
import { PasswordRequirements } from '@/components/auth/register/PasswordRequirements';
import { isPasswordValid } from '@/lib/validation/password';
import { Toast } from '@/components/ui/Toast';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

export function AccountProfile({ userEmail }: { userEmail: string }) {
  const [profile, setProfile] = useState<Partial<ShippingProfile>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);
  const [chatNotificationsEnabled, setChatNotificationsEnabled] = useState(true);
  const [isChatSaving, setIsChatSaving] = useState(false);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isDefaultSaving, setIsDefaultSaving] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
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
    loadChatNotifications();
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

  const loadChatNotifications = async () => {
    try {
      const response = await fetch('/api/account/notifications', { cache: 'no-store' });
      const data = await response.json();
      setChatNotificationsEnabled(Boolean(data.chat_notifications_enabled));
    } catch (error) {
      logError(error, { layer: "frontend", event: "account_load_chat_notifications" });
    }
  };

  const handleSaveChatNotifications = async () => {
    setIsChatSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/account/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_notifications_enabled: chatNotificationsEnabled }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(data?.error ?? 'Failed to update chat notifications');
        return;
      }

      setMessage('Chat notification preference updated.');
    } catch (error) {
      setMessage('Failed to update chat notifications');
    } finally {
      setIsChatSaving(false);
    }
  };

  const formatField = (value?: string | null) => (value ?? '').trim().toLowerCase();

  const isDefaultAddress = (address: any) => {
    if (!profile.address_line1) return false;
    return (
      formatField(profile.address_line1) === formatField(address.line1) &&
      formatField(profile.address_line2) === formatField(address.line2) &&
      formatField(profile.city) === formatField(address.city) &&
      formatField(profile.state) === formatField(address.state) &&
      formatField(profile.postal_code) === formatField(address.postal_code) &&
      formatField(profile.country) === formatField(address.country)
    );
  };

  const handleSetDefaultAddress = async (address: any, silent?: boolean) => {
    setIsDefaultSaving(true);
    if (!silent) {
      setMessage('');
    }

    try {
      const response = await fetch('/api/account/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: address.name ?? null,
          phone: address.phone ?? null,
          address_line1: address.line1 ?? null,
          address_line2: address.line2 ?? null,
          city: address.city ?? null,
          state: address.state ?? null,
          postal_code: address.postal_code ?? null,
          country: address.country ?? null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (!silent) {
          setMessage(data?.error ?? 'Failed to set default shipping address');
        }
        return;
      }

      setProfile(data || {});
      if (!silent) {
        setMessage('Default shipping address updated successfully.');
      }
    } catch (error) {
      if (!silent) {
        setMessage('Error updating default shipping address');
      }
    } finally {
      setIsDefaultSaving(false);
    }
  };

  const handleClearDefaultShipping = async (silent?: boolean) => {
    setIsDefaultSaving(true);
    if (!silent) {
      setMessage('');
    }

    try {
      const response = await fetch('/api/account/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: null,
          phone: null,
          address_line1: null,
          address_line2: null,
          city: null,
          state: null,
          postal_code: null,
          country: null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (!silent) {
          setMessage(data?.error ?? 'Failed to clear default shipping address');
        }
        return;
      }

      setProfile(data || {});
      if (!silent) {
        setMessage('Default shipping address cleared successfully.');
      }
    } catch (error) {
      if (!silent) {
        setMessage('Error clearing default shipping address');
      }
    } finally {
      setIsDefaultSaving(false);
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

    if (!isPasswordValid(newPassword)) {
      setMessage('Password does not meet the required criteria.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(`Failed to change password: ${data?.error ?? 'Unknown error'}`);
      } else {
        setToast({ message: 'Password changed successfully!', tone: 'success' });
        setNewPassword('');
        setConfirmPassword('');
        setNewPasswordVisible(false);
        setConfirmPasswordVisible(false);
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
    const addressPayload = { ...addressForm };

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
      if (setAsDefault) {
        await handleSetDefaultAddress({
          name: addressPayload.name,
          phone: addressPayload.phone,
          line1: addressPayload.line1,
          line2: addressPayload.line2,
          city: addressPayload.city,
          state: addressPayload.state,
          postal_code: addressPayload.postal_code,
          country: addressPayload.country,
        }, true);
      }
      setSetAsDefault(false);
      setMessage(
        setAsDefault
          ? 'Address saved successfully and set as default shipping.'
          : 'Address saved successfully!'
      );
    } catch (error) {
      setMessage('Error saving address');
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    setMessage('');
    const targetAddress = addresses.find((address) => address.id === addressId);
    const wasDefault = targetAddress ? isDefaultAddress(targetAddress) : false;
    try {
      const response = await fetch(`/api/account/addresses/${addressId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        setMessage('Failed to remove address');
        return;
      }

      setAddresses((prev) => prev.filter((address) => address.id !== addressId));
      if (wasDefault) {
        await handleClearDefaultShipping(true);
      }
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

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Chat Notifications</h2>
        <p className="text-gray-400 mb-4">
          Get email updates when admins reply to your chat.
        </p>
        <div className="flex items-center justify-between gap-4 text-sm text-zinc-300">
          <span>Email me about chat replies</span>
          <ToggleSwitch
            checked={chatNotificationsEnabled}
            onChange={setChatNotificationsEnabled}
            ariaLabel="Chat notification preference"
          />
        </div>
        <button
          type="button"
          onClick={handleSaveChatNotifications}
          disabled={isChatSaving}
          className="mt-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
        >
          {isChatSaving ? 'Saving...' : 'Save Preference'}
        </button>
      </div>

      {/* Saved Addresses */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-xl font-semibold text-white">Shipping Addresses</h2>
          <span className="text-xs text-zinc-500">Save multiple addresses and pick a default for checkout.</span>
        </div>

        <div className="border border-zinc-800/70 rounded p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Default shipping address</div>
              {profile.address_line1 ? (
                <div className="text-sm text-zinc-300 mt-2 space-y-1">
                  {profile.full_name && <div className="text-white font-semibold">{profile.full_name}</div>}
                  <div>{profile.address_line1}</div>
                  {profile.address_line2 && <div>{profile.address_line2}</div>}
                  <div>
                    {profile.city}, {profile.state} {profile.postal_code}
                  </div>
                  <div>{profile.country}</div>
                  {profile.phone && <div className="text-zinc-500">{profile.phone}</div>}
                </div>
              ) : (
                <div className="text-sm text-zinc-500 mt-2">
                  No default shipping address yet. Choose one below.
                </div>
              )}
            </div>
            {profile.address_line1 && (
              <button
                type="button"
                onClick={() => handleClearDefaultShipping()}
                disabled={isDefaultSaving}
                className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-60"
              >
                {isDefaultSaving ? 'Updating...' : 'Clear default'}
              </button>
            )}
          </div>
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
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <span>{address.name || 'Saved Address'}</span>
                      {isDefaultAddress(address) && (
                        <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-300 bg-zinc-800/70 px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
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
                {!isDefaultAddress(address) && (
                  <button
                    type="button"
                    onClick={() => handleSetDefaultAddress(address)}
                    disabled={isDefaultSaving}
                    className="mt-3 text-xs text-zinc-300 hover:text-white transition-colors disabled:opacity-60"
                  >
                    {isDefaultSaving ? 'Updating...' : 'Set as default shipping'}
                  </button>
                )}
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
            <label className="block text-gray-400 text-sm mb-1">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={addressForm.line1}
              onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Apartment / Unit</label>
            <input
              type="text"
              value={addressForm.line2}
              onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addressForm.city}
                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                State <span className="text-red-500">*</span>
              </label>
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
              <label className="block text-gray-400 text-sm mb-1">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addressForm.postal_code}
                onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addressForm.country}
                onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={setAsDefault}
              onChange={(e) => setSetAsDefault(e.target.checked)}
              className="rdk-checkbox"
            />
            Set as default shipping address
          </label>

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
            <div className="relative">
              <input
                type={newPasswordVisible ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-zinc-800 text-white px-4 py-2 pr-11 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <button
                type="button"
                onClick={() => setNewPasswordVisible((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label={newPasswordVisible ? 'Hide password' : 'Show password'}
              >
                {newPasswordVisible ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <PasswordRequirements password={newPassword} />

          <div>
            <label className="block text-gray-400 text-sm mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={confirmPasswordVisible ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-zinc-800 text-white px-4 py-2 pr-11 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <button
                type="button"
                onClick={() => setConfirmPasswordVisible((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label={confirmPasswordVisible ? 'Hide password' : 'Show password'}
              >
                {confirmPasswordVisible ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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
      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        tone={toast?.tone ?? 'info'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
