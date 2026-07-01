"use client";

import type { FormEvent } from "react";

import type { Tables } from "@/types/db/database.types";

type ShippingProfile = Tables<"shipping_profiles">;

export type AccountAddress = {
  id: string;
  name?: string | null;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type AccountAddressInput = Omit<AccountAddress, "id"> & { id?: string };

interface AddressFormState {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface AccountAddressesSectionProps {
  profile: Partial<ShippingProfile>;
  addresses: AccountAddress[];
  isAddressesLoading: boolean;
  isAddressSaving: boolean;
  isDefaultSaving: boolean;
  setAsDefault: boolean;
  addressForm: AddressFormState;
  sectionClass: string;
  inputClass: string;
  primaryButtonClass: string;
  isDefaultAddress: (address: AccountAddress) => boolean;
  onClearDefaultShipping: () => void;
  onDeleteAddress: (addressId: string) => void;
  onSetDefaultAddress: (address: AccountAddressInput) => void;
  onSaveAddress: (event: FormEvent) => void;
  onAddressFormChange: (addressForm: AddressFormState) => void;
  onSetAsDefaultChange: (checked: boolean) => void;
}

export function AccountAddressesSection({
  profile,
  addresses,
  isAddressesLoading,
  isAddressSaving,
  isDefaultSaving,
  setAsDefault,
  addressForm,
  sectionClass,
  inputClass,
  primaryButtonClass,
  isDefaultAddress,
  onClearDefaultShipping,
  onDeleteAddress,
  onSetDefaultAddress,
  onSaveAddress,
  onAddressFormChange,
  onSetAsDefaultChange,
}: AccountAddressesSectionProps) {
  return (
    <div className={sectionClass}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold uppercase tracking-[0.08em] text-brand-text sm:text-xl">
          Shipping Addresses
        </h2>
        <span className="text-[11px] text-brand-muted sm:text-xs">
          Save multiple addresses and pick a default for checkout.
        </span>
      </div>

      <div className="mb-6 border border-brand-border bg-brand-page p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-brand-muted sm:text-xs">
              Default shipping address
            </div>
            {profile.address_line1 ? (
              <div className="mt-2 space-y-1 text-[12px] text-brand-text sm:text-sm">
                {profile.full_name && (
                  <div className="font-semibold">{profile.full_name}</div>
                )}
                <div>{profile.address_line1}</div>
                {profile.address_line2 && <div>{profile.address_line2}</div>}
                <div>
                  {profile.city}, {profile.state} {profile.postal_code}
                </div>
                <div>{profile.country}</div>
                {profile.phone && <div className="text-brand-muted">{profile.phone}</div>}
              </div>
            ) : (
              <div className="mt-2 text-[12px] text-brand-muted sm:text-sm">
                No default shipping address yet. Choose one below.
              </div>
            )}
          </div>
          {profile.address_line1 && (
            <button
              type="button"
              onClick={onClearDefaultShipping}
              disabled={isDefaultSaving}
              className="text-[11px] text-brand-muted transition-colors hover:text-brand-text disabled:opacity-60 sm:text-xs"
            >
              {isDefaultSaving ? "Updating..." : "Clear default"}
            </button>
          )}
        </div>
      </div>

      {isAddressesLoading ? (
        <div className="mb-6 text-brand-muted">Loading addresses...</div>
      ) : addresses.length === 0 ? (
        <div className="mb-6 text-brand-muted">No saved addresses yet.</div>
      ) : (
        <div className="mb-6 space-y-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="border border-brand-border bg-brand-page p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-[12px] text-brand-text sm:text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <span>{address.name || "Saved Address"}</span>
                    {isDefaultAddress(address) && (
                      <span className="bg-brand-text px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-brand-surface">
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
                  {address.phone && (
                    <div className="text-brand-muted">{address.phone}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteAddress(address.id)}
                  className="text-[11px] text-brand-muted transition-colors hover:text-brand-text sm:text-xs"
                >
                  Remove
                </button>
              </div>
              {!isDefaultAddress(address) && (
                <button
                  type="button"
                  onClick={() => onSetDefaultAddress(address)}
                  disabled={isDefaultSaving}
                  className="mt-3 text-[11px] text-brand-text transition-colors hover:text-neutral-600 disabled:opacity-60 sm:text-xs"
                >
                  {isDefaultSaving ? "Updating..." : "Set as default shipping"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onSaveAddress} className="space-y-4">
        <div>
          <label className="mb-1 block text-[12px] text-brand-muted sm:text-sm">
            Full Name
          </label>
          <input
            type="text"
            value={addressForm.name}
            onChange={(event) =>
              onAddressFormChange({ ...addressForm, name: event.target.value })
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-[12px] text-brand-muted sm:text-sm">
            Phone
          </label>
          <input
            type="tel"
            value={addressForm.phone}
            onChange={(event) =>
              onAddressFormChange({ ...addressForm, phone: event.target.value })
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-[12px] text-brand-muted sm:text-sm">
            Address Line 1 <span className="text-brand-text">*</span>
          </label>
          <input
            type="text"
            required
            value={addressForm.line1}
            onChange={(event) =>
              onAddressFormChange({ ...addressForm, line1: event.target.value })
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-[12px] text-brand-muted sm:text-sm">
            Apartment / Unit
          </label>
          <input
            type="text"
            value={addressForm.line2}
            onChange={(event) =>
              onAddressFormChange({ ...addressForm, line2: event.target.value })
            }
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-[12px] text-brand-muted sm:text-sm">
              City <span className="text-brand-text">*</span>
            </label>
            <input
              type="text"
              required
              value={addressForm.city}
              onChange={(event) =>
                onAddressFormChange({ ...addressForm, city: event.target.value })
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] text-brand-muted sm:text-sm">
              State <span className="text-brand-text">*</span>
            </label>
            <input
              type="text"
              required
              value={addressForm.state}
              onChange={(event) =>
                onAddressFormChange({ ...addressForm, state: event.target.value })
              }
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-[12px] text-brand-muted sm:text-sm">
              Postal Code <span className="text-brand-text">*</span>
            </label>
            <input
              type="text"
              required
              value={addressForm.postal_code}
              onChange={(event) =>
                onAddressFormChange({
                  ...addressForm,
                  postal_code: event.target.value,
                })
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] text-brand-muted sm:text-sm">
              Country <span className="text-brand-text">*</span>
            </label>
            <input
              type="text"
              required
              value={addressForm.country}
              onChange={(event) =>
                onAddressFormChange({ ...addressForm, country: event.target.value })
              }
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-[12px] text-brand-muted sm:text-sm">
          <input
            type="checkbox"
            checked={setAsDefault}
            onChange={(event) => onSetAsDefaultChange(event.target.checked)}
            className="rdk-checkbox"
          />
          Set as default shipping address
        </label>

        <button type="submit" disabled={isAddressSaving} className={primaryButtonClass}>
          {isAddressSaving ? "Saving..." : "Add Address"}
        </button>
      </form>
    </div>
  );
}
