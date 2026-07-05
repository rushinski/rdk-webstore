"use client";

import { adminFormStyles } from "@/modules/shared/presentation/admin/ui/adminFormStyles";
import type { ShippingOrigin } from "@/types/domain/shipping";

import { ORIGIN_MODAL_FIELDS } from "@/modules/orders/presentation/admin/shipping/originModalFields";

type OriginErrors = Partial<Record<keyof ShippingOrigin, string>>;

type OriginAddressFieldsProps = {
  errors: OriginErrors;
  onChange: (field: keyof ShippingOrigin, value: string) => void;
  value: ShippingOrigin;
};

function getOriginFieldValue(value: ShippingOrigin, field: keyof ShippingOrigin) {
  return value[field] ?? "";
}

export function OriginAddressFields({
  errors,
  onChange,
  value,
}: OriginAddressFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px] sm:gap-4 sm:text-sm md:grid-cols-2">
      <div className="col-span-2 text-[10px] text-brand-muted sm:text-xs">
        Provide a contact name or company name. Phone number is optional.
      </div>

      {ORIGIN_MODAL_FIELDS.map((definition) => {
        const error = errors[definition.field];

        return (
          <div key={definition.field}>
            <label className={adminFormStyles.label}>
              {definition.label}
              {definition.optional ? " (optional)" : ""}
            </label>
            <input
              type="text"
              value={getOriginFieldValue(value, definition.field)}
              onChange={(event) => onChange(definition.field, event.target.value)}
              className={`${adminFormStyles.input} px-2 py-1.5 ${
                error ? "border-red-500" : ""
              }`}
            />
            {error ? <div className="mt-1 text-[10px] text-red-400">{error}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

