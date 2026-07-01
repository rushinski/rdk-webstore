"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import {
  AccountAddressesSection,
  type AccountAddress,
  type AccountAddressInput,
} from "@/components/account/AccountAddressesSection";
import { PasswordRequirements } from "@/components/auth/register/PasswordRequirements";
import { Toast } from "@/components/ui/Toast";
import { isPasswordValid } from "@/lib/validation/password";
import { logError } from "@/lib/utils/log";
import type { Tables } from "@/types/db/database.types";

type ShippingProfile = Tables<"shipping_profiles">;

type AccountOrderItem = {
  id: string;
  product_name?: string | null;
  size_label?: string | null;
  quantity?: number | null;
  product?: {
    brand?: string | null;
    name?: string | null;
  } | null;
  variant?: { size_label?: string | null } | null;
};

type AccountOrder = {
  id: string;
  created_at: string;
  status?: string | null;
  total?: number | null;
  fulfillment?: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  items?: AccountOrderItem[] | null;
};

const sectionClass =
  "mb-6 border border-brand-border bg-brand-surface p-4 shadow-[0_20px_60px_rgba(17,17,17,0.06)] sm:p-6";
const inputClass =
  "w-full border border-brand-border bg-brand-page px-4 py-3 text-[13px] text-brand-text outline-none transition-colors focus:border-brand-text sm:text-sm";
const primaryButtonClass =
  "border border-brand-text bg-brand-text px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800 disabled:border-neutral-400 disabled:bg-neutral-400 sm:text-sm";

export function AccountProfile({ userEmail }: { userEmail: string }) {
  const [profile, setProfile] = useState<Partial<ShippingProfile>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isDefaultSaving, setIsDefaultSaving] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  useEffect(() => {
    void loadProfile();
    void loadOrders();
    void loadAddresses();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/account/shipping");
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      logError(error, { layer: "frontend", event: "account_load_profile" });
    }
  };

  const loadOrders = async () => {
    setIsOrdersLoading(true);
    try {
      const response = await fetch("/api/account/orders");
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      logError(error, { layer: "frontend", event: "account_load_orders" });
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const formatField = (value?: string | null) => (value ?? "").trim().toLowerCase();

  const isDefaultAddress = (address: AccountAddress) => {
    if (!profile.address_line1) {
      return false;
    }

    return (
      formatField(profile.address_line1) === formatField(address.line1) &&
      formatField(profile.address_line2) === formatField(address.line2) &&
      formatField(profile.city) === formatField(address.city) &&
      formatField(profile.state) === formatField(address.state) &&
      formatField(profile.postal_code) === formatField(address.postal_code) &&
      formatField(profile.country) === formatField(address.country)
    );
  };

  const handleSetDefaultAddress = async (
    address: AccountAddressInput,
    silent?: boolean,
  ) => {
    setIsDefaultSaving(true);
    if (!silent) {
      setMessage("");
    }

    try {
      const response = await fetch("/api/account/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          setMessage(data?.error ?? "Failed to set default shipping address");
        }
        return;
      }

      setProfile(data || {});
      if (!silent) {
        setMessage("Default shipping address updated successfully.");
      }
    } catch {
      if (!silent) {
        setMessage("Error updating default shipping address");
      }
    } finally {
      setIsDefaultSaving(false);
    }
  };

  const handleClearDefaultShipping = async (silent?: boolean) => {
    setIsDefaultSaving(true);
    if (!silent) {
      setMessage("");
    }

    try {
      const response = await fetch("/api/account/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          setMessage(data?.error ?? "Failed to clear default shipping address");
        }
        return;
      }

      setProfile(data || {});
      if (!silent) {
        setMessage("Default shipping address cleared successfully.");
      }
    } catch {
      if (!silent) {
        setMessage("Error clearing default shipping address");
      }
    } finally {
      setIsDefaultSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!isPasswordValid(newPassword)) {
      setMessage("Password does not meet the required criteria.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(`Failed to change password: ${data?.error ?? "Unknown error"}`);
      } else {
        setToast({ message: "Password changed successfully!", tone: "success" });
        setNewPassword("");
        setConfirmPassword("");
        setNewPasswordVisible(false);
        setConfirmPasswordVisible(false);
      }
    } catch {
      setMessage("Error changing password");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAddresses = async () => {
    setIsAddressesLoading(true);
    try {
      const response = await fetch("/api/account/addresses");
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
    setMessage("");
    const addressPayload = { ...addressForm };

    try {
      const response = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });

      if (!response.ok) {
        setMessage("Failed to save address");
        return;
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
      setAddressForm({
        name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
      });
      if (setAsDefault) {
        await handleSetDefaultAddress(
          {
            name: addressPayload.name,
            phone: addressPayload.phone,
            line1: addressPayload.line1,
            line2: addressPayload.line2,
            city: addressPayload.city,
            state: addressPayload.state,
            postal_code: addressPayload.postal_code,
            country: addressPayload.country,
          },
          true,
        );
      }
      setSetAsDefault(false);
      setMessage(
        setAsDefault
          ? "Address saved successfully and set as default shipping."
          : "Address saved successfully!",
      );
    } catch {
      setMessage("Error saving address");
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    setMessage("");
    const targetAddress = addresses.find((address) => address.id === addressId);
    const wasDefault = targetAddress ? isDefaultAddress(targetAddress) : false;

    try {
      const response = await fetch(`/api/account/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setMessage("Failed to remove address");
        return;
      }

      setAddresses((prev) => prev.filter((address) => address.id !== addressId));
      if (wasDefault) {
        await handleClearDefaultShipping(true);
      }
    } catch {
      setMessage("Error removing address");
    }
  };

  const getTrackingUrl = (carrier?: string | null, trackingNumber?: string | null) => {
    if (!trackingNumber) {
      return null;
    }

    const normalized = (carrier ?? "").toLowerCase();
    const encodedTracking = encodeURIComponent(trackingNumber);

    if (normalized.includes("ups")) {
      return `https://www.ups.com/track?loc=en_US&tracknum=${encodedTracking}`;
    }
    if (normalized.includes("usps")) {
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodedTracking}`;
    }
    if (normalized.includes("fedex") || normalized.includes("fed ex")) {
      return `https://www.fedex.com/fedextrack/?trknbr=${encodedTracking}`;
    }
    if (normalized.includes("dhl")) {
      return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodedTracking}`;
    }

    return null;
  };

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      setMessage("Failed to log out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const messageToneClass =
    message.toLowerCase().includes("success") || message.toLowerCase().includes("updated")
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-[13px] sm:text-base">
      <h1 className="mb-6 text-2xl font-black uppercase tracking-[0.08em] text-brand-text sm:mb-8 sm:text-3xl">
        Account Settings
      </h1>

      {message && (
        <div className={`mb-6 border px-4 py-3 text-sm ${messageToneClass}`}>
          {message}
        </div>
      )}

      <div className={sectionClass}>
        <h2 className="mb-3 text-lg font-bold uppercase tracking-[0.08em] text-brand-text sm:mb-4 sm:text-xl">
          Email
        </h2>
        <p className="text-brand-text">{userEmail}</p>
        <p className="mt-2 text-[12px] text-brand-muted sm:text-sm">
          Email changes are not currently supported
        </p>
      </div>

      <AccountAddressesSection
        profile={profile}
        addresses={addresses}
        isAddressesLoading={isAddressesLoading}
        isAddressSaving={isAddressSaving}
        isDefaultSaving={isDefaultSaving}
        setAsDefault={setAsDefault}
        addressForm={addressForm}
        sectionClass={sectionClass}
        inputClass={inputClass}
        primaryButtonClass={primaryButtonClass}
        isDefaultAddress={isDefaultAddress}
        onClearDefaultShipping={() => {
          void handleClearDefaultShipping();
        }}
        onDeleteAddress={(addressId) => {
          void handleDeleteAddress(addressId);
        }}
        onSetDefaultAddress={(address) => {
          void handleSetDefaultAddress(address);
        }}
        onSaveAddress={(event) => {
          void handleSaveAddress(event);
        }}
        onAddressFormChange={setAddressForm}
        onSetAsDefaultChange={setSetAsDefault}
      />

      <div className={sectionClass}>
        <h2 className="mb-3 text-lg font-bold uppercase tracking-[0.08em] text-brand-text sm:mb-4 sm:text-xl">
          Order History
        </h2>
        {isOrdersLoading ? (
          <div className="text-brand-muted">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-brand-muted">No orders yet.</div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const trackingUrl = getTrackingUrl(
                order.shipping_carrier,
                order.tracking_number,
              );
              const showTracking = order.fulfillment === "ship" && order.tracking_number;

              return (
                <div
                  key={order.id}
                  className="border border-brand-border bg-brand-page p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-brand-text">
                      Order #{order.id.slice(0, 8)}
                    </div>
                    <div className="text-[12px] text-brand-muted sm:text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] text-brand-muted sm:text-sm">
                      Status: {order.status}
                    </span>
                    <span className="font-semibold text-brand-text">
                      ${Number(order.total ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(order.items || []).map((item: AccountOrderItem) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-[12px] sm:text-sm"
                      >
                        <span className="text-brand-text">
                          {item.product_name ?? item.product?.name ?? "Item"}
                          {(item.size_label ?? item.variant?.size_label)
                            ? ` (${item.size_label ?? item.variant?.size_label})`
                            : ""}
                        </span>
                        <span className="text-brand-muted">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  {showTracking && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] sm:text-sm">
                      <div className="text-brand-muted">
                        Tracking:{" "}
                        {order.shipping_carrier ? `${order.shipping_carrier} ` : ""}
                        <span className="text-brand-text">{order.tracking_number}</span>
                      </div>
                      {trackingUrl ? (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand-text underline-offset-4 transition-colors hover:text-neutral-600 hover:underline"
                        >
                          Track shipment
                        </a>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={sectionClass}>
        <h2 className="mb-3 text-lg font-bold uppercase tracking-[0.08em] text-brand-text sm:mb-4 sm:text-xl">
          Change Password
        </h2>
        <form
          onSubmit={(event) => {
            void handleChangePassword(event);
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-[12px] text-brand-muted sm:text-sm">
              New Password
            </label>
            <div className="relative">
              <input
                type={newPasswordVisible ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setNewPasswordVisible((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted transition-colors hover:text-brand-text"
                aria-label={newPasswordVisible ? "Hide password" : "Show password"}
              >
                {newPasswordVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <PasswordRequirements password={newPassword} />

          <div>
            <label className="mb-1 block text-[12px] text-brand-muted sm:text-sm">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={confirmPasswordVisible ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setConfirmPasswordVisible((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted transition-colors hover:text-brand-text"
                aria-label={confirmPasswordVisible ? "Hide password" : "Show password"}
              >
                {confirmPasswordVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className={primaryButtonClass}>
            {isLoading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      <div className="border border-brand-border bg-brand-surface p-4 shadow-[0_20px_60px_rgba(17,17,17,0.06)] sm:p-6">
        <h2 className="mb-3 text-lg font-bold uppercase tracking-[0.08em] text-brand-text sm:mb-4 sm:text-xl">
          Sign out
        </h2>
        <p className="mb-4 text-[12px] text-brand-muted sm:text-sm">
          You can sign back in anytime to view your orders and account details.
        </p>
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          disabled={isSigningOut}
          className="cursor-pointer border border-brand-text bg-brand-page px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-text transition-colors hover:bg-brand-text hover:text-brand-surface disabled:border-neutral-400 disabled:text-neutral-400 sm:text-sm"
        >
          {isSigningOut ? "Signing out..." : "Logout"}
        </button>
      </div>

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
