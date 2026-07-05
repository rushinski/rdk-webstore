import {
  centsToMoneyString,
  defaultPackage,
  moneyToCents,
  type OriginErrors,
  type ShippingDefaultValues,
  type ShippingOriginAddress,
} from "@/modules/settings/presentation/admin/shipping/shippingSettingsConfig";

type ShippingDimensionField = "weight" | "length" | "width" | "height";

type ShippingDefaultsModalState = {
  defaultsDraft: ShippingDefaultValues;
  heightInput: string;
  lengthInput: string;
  shippingCostInput: string;
  weightInput: string;
  widthInput: string;
};

export function createShippingDefaultsModalState(
  current: ShippingDefaultValues = defaultPackage,
): ShippingDefaultsModalState {
  return {
    defaultsDraft: { ...current },
    shippingCostInput: centsToMoneyString(current.shipping_cost_cents),
    weightInput: String(current.default_weight_oz),
    lengthInput: String(current.default_length_in),
    widthInput: String(current.default_width_in),
    heightInput: String(current.default_height_in),
  };
}

export function createClosedShippingDefaultsState() {
  return createShippingDefaultsModalState(defaultPackage);
}

export function cleanShippingDimensionInput(value: string) {
  return value.replace(/[^\d.]/g, "");
}

export function applyShippingDimensionDraftValue(
  draft: ShippingDefaultValues | null,
  field: ShippingDimensionField,
  cleanedValue: string,
) {
  if (!draft) {
    return draft;
  }

  const numericValue = Number(cleanedValue);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return draft;
  }

  const fieldMap = {
    height: "default_height_in" as const,
    length: "default_length_in" as const,
    weight: "default_weight_oz" as const,
    width: "default_width_in" as const,
  };

  return { ...draft, [fieldMap[field]]: numericValue };
}

export function applyShippingCostDraftValue(
  draft: ShippingDefaultValues | null,
  value: string,
) {
  if (!draft) {
    return draft;
  }

  return {
    ...draft,
    shipping_cost_cents: moneyToCents(value),
  };
}

export function updateOriginDraftField(
  draft: ShippingOriginAddress,
  field: keyof ShippingOriginAddress,
  value: string,
) {
  return { ...draft, [field]: value };
}

export function clearOriginFieldError(
  errors: OriginErrors,
  field: keyof ShippingOriginAddress,
) {
  if (!errors[field]) {
    return errors;
  }

  const next = { ...errors };
  delete next[field];
  return next;
}

export function toggleShippingCarrierSelection(
  carriers: string[],
  carrierKey: string,
) {
  if (carriers.includes(carrierKey)) {
    return carriers.filter((carrier) => carrier !== carrierKey);
  }

  return [...carriers, carrierKey];
}
