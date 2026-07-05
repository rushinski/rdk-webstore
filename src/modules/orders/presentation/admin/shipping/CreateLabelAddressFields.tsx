"use client";

import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import type {
  AddressErrors,
  AddressValidationStatus,
  ShippingAddressDraft,
} from "@/modules/orders/presentation/admin/shipping/createLabelFormTypes";

const fieldInputClass = (hasError?: boolean) =>
  `${adminFormStyles.input} px-2 py-1.5 text-[12px] sm:text-sm ${hasError ? "border-red-500" : ""}`;

type CreateLabelAddressFieldsProps = {
  addressErrors: AddressErrors;
  hasAddressErrors: boolean;
  recipient: ShippingAddressDraft;
  setRecipientField: (field: keyof ShippingAddressDraft, value: string) => void;
  validationStatus: AddressValidationStatus;
};

export function CreateLabelAddressFields({
  addressErrors,
  hasAddressErrors,
  recipient,
  setRecipientField,
  validationStatus,
}: CreateLabelAddressFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.12em] text-brand-muted">
          Shipping To
        </div>
        {validationStatus === "valid" ? (
          <div className="flex items-center gap-1 text-xs text-emerald-700">
            Valid address
          </div>
        ) : null}
        {validationStatus === "invalid" && hasAddressErrors ? (
          <div className="flex items-center gap-1 text-xs text-red-700">
            Fix errors below
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] sm:gap-3 sm:text-sm">
        <div>
          <label className={adminFormStyles.label}>Name</label>
          <input
            type="text"
            value={recipient.name}
            onChange={(event) => setRecipientField("name", event.target.value)}
            className={fieldInputClass()}
          />
        </div>
        <div>
          <label className={adminFormStyles.label}>Phone *</label>
          <input
            type="text"
            value={recipient.phone}
            onChange={(event) => setRecipientField("phone", event.target.value)}
            className={fieldInputClass(Boolean(addressErrors.phone))}
          />
          {addressErrors.phone ? (
            <div className={adminFormStyles.error}>{addressErrors.phone}</div>
          ) : null}
        </div>

        <div className="col-span-2">
          <label className={adminFormStyles.label}>Address line 1 *</label>
          <input
            type="text"
            value={recipient.line1}
            onChange={(event) => setRecipientField("line1", event.target.value)}
            className={fieldInputClass(Boolean(addressErrors.line1))}
          />
          {addressErrors.line1 ? (
            <div className={adminFormStyles.error}>{addressErrors.line1}</div>
          ) : null}
        </div>
        <div className="col-span-2">
          <label className={adminFormStyles.label}>Address line 2</label>
          <input
            type="text"
            value={recipient.line2}
            onChange={(event) => setRecipientField("line2", event.target.value)}
            className={fieldInputClass()}
          />
        </div>

        <div>
          <label className={adminFormStyles.label}>City *</label>
          <input
            type="text"
            value={recipient.city}
            onChange={(event) => setRecipientField("city", event.target.value)}
            className={fieldInputClass(Boolean(addressErrors.city))}
          />
          {addressErrors.city ? (
            <div className={adminFormStyles.error}>{addressErrors.city}</div>
          ) : null}
        </div>
        <div>
          <label className={adminFormStyles.label}>State *</label>
          <input
            type="text"
            value={recipient.state}
            onChange={(event) =>
              setRecipientField("state", event.target.value.toUpperCase())
            }
            maxLength={2}
            placeholder="CA"
            className={fieldInputClass(Boolean(addressErrors.state))}
          />
          {addressErrors.state ? (
            <div className={adminFormStyles.error}>{addressErrors.state}</div>
          ) : null}
        </div>
        <div>
          <label className={adminFormStyles.label}>ZIP Code *</label>
          <input
            type="text"
            value={recipient.postal_code}
            onChange={(event) => setRecipientField("postal_code", event.target.value)}
            placeholder="12345"
            className={fieldInputClass(Boolean(addressErrors.postal_code))}
          />
          {addressErrors.postal_code ? (
            <div className={adminFormStyles.error}>{addressErrors.postal_code}</div>
          ) : null}
        </div>
        <div>
          <label className={adminFormStyles.label}>Country *</label>
          <input
            type="text"
            value={recipient.country}
            onChange={(event) =>
              setRecipientField("country", event.target.value.toUpperCase())
            }
            maxLength={2}
            placeholder="US"
            className={fieldInputClass(Boolean(addressErrors.country))}
          />
          {addressErrors.country ? (
            <div className={adminFormStyles.error}>{addressErrors.country}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
