"use client";

import { useEffect, useMemo, useState } from "react";

import { logError } from "@/lib/utils/log";

export const SHIPPING_CATEGORIES = [
  { key: "sneakers", label: "Sneakers" },
  { key: "clothing", label: "Clothing" },
  { key: "accessories", label: "Accessories" },
  { key: "electronics", label: "Electronics" },
];

export const AVAILABLE_CARRIERS = [
  { key: "UPS", label: "UPS", description: "United Parcel Service" },
  { key: "USPS", label: "USPS", description: "United States Postal Service" },
  { key: "FedEx", label: "FedEx", description: "Federal Express" },
];

export type ShippingDefaultValues = {
  shipping_cost_cents: number;
  default_weight_oz: number;
  default_length_in: number;
  default_width_in: number;
  default_height_in: number;
};

export const defaultPackage: ShippingDefaultValues = {
  shipping_cost_cents: 0,
  default_weight_oz: 16,
  default_length_in: 12,
  default_width_in: 12,
  default_height_in: 12,
};

export const initialOrigin = {
  name: "",
  company: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
};

export type ShippingOriginAddress = typeof initialOrigin;
export type OriginField = keyof ShippingOriginAddress;
export type OriginErrors = Partial<Record<OriginField, string>>;

export function moneyToCents(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned || cleaned === ".") {
    return 0;
  }

  const firstDot = cleaned.indexOf(".");
  let normalized = cleaned;

  if (firstDot !== -1) {
    const before = cleaned.slice(0, firstDot + 1);
    const after = cleaned.slice(firstDot + 1).replace(/\./g, "");
    normalized = before + after;
  }

  const [whole, frac = ""] = normalized.split(".");
  const wholeNum = Number(whole || "0");
  if (!Number.isFinite(wholeNum)) {
    return 0;
  }

  const centsStr = `${frac}00`.slice(0, 2);
  const centsNum = Number(centsStr || "0");
  if (!Number.isFinite(centsNum)) {
    return 0;
  }

  return wholeNum * 100 + centsNum;
}

export function centsToMoneyString(cents: number) {
  const safe = Number.isFinite(cents) ? cents : 0;
  return (safe / 100).toFixed(2);
}

function extractOriginErrors(
  issues: Record<string, { _errors?: string[] }> | undefined,
): OriginErrors {
  const next: OriginErrors = {};
  if (!issues || typeof issues !== "object") {
    return next;
  }

  const fields: OriginField[] = [
    "name",
    "company",
    "phone",
    "line1",
    "line2",
    "city",
    "state",
    "postal_code",
    "country",
  ];

  fields.forEach((field) => {
    const entry = issues[field];
    if (entry?._errors?.length) {
      next[field] = entry._errors[0];
    }
  });

  return next;
}

function validateOriginDraft(
  draft: ShippingOriginAddress,
  requiredNameMessage: string,
): OriginErrors {
  const errors: OriginErrors = {};
  const name = draft.name.trim();
  const company = (draft.company ?? "").trim();

  if (!name && !company) {
    errors.name = requiredNameMessage;
    errors.company = requiredNameMessage;
  }
  if (!draft.line1.trim()) {
    errors.line1 = "Street address is required.";
  }
  if (!draft.city.trim()) {
    errors.city = "City is required.";
  }
  if (!draft.state.trim()) {
    errors.state = "State is required.";
  }
  if (!draft.postal_code.trim()) {
    errors.postal_code = "ZIP / postal code is required.";
  }
  if (!draft.country.trim()) {
    errors.country = "Country is required.";
  }

  return errors;
}

export function useAdminShippingSettingsData() {
  const [shippingDefaults, setShippingDefaults] = useState<
    Record<string, ShippingDefaultValues>
  >({});
  const [originAddress, setOriginAddress] =
    useState<ShippingOriginAddress>(initialOrigin);
  const [enabledCarriers, setEnabledCarriers] = useState<string[]>([]);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [isSavingOrigin, setIsSavingOrigin] = useState(false);
  const [isSavingCarriers, setIsSavingCarriers] = useState(false);
  const [message, setMessage] = useState("");
  const [originMessage, setOriginMessage] = useState("");
  const [originError, setOriginError] = useState("");
  const [originErrors, setOriginErrors] = useState<OriginErrors>({});
  const [carriersMessage, setCarriersMessage] = useState("");
  const [isDefaultsModalOpen, setIsDefaultsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [defaultsDraft, setDefaultsDraft] = useState<ShippingDefaultValues | null>(null);
  const [shippingCostInput, setShippingCostInput] = useState("0.00");
  const [weightInput, setWeightInput] = useState("16");
  const [lengthInput, setLengthInput] = useState("12");
  const [widthInput, setWidthInput] = useState("12");
  const [heightInput, setHeightInput] = useState("12");
  const [isOriginModalOpen, setIsOriginModalOpen] = useState(false);
  const [originDraft, setOriginDraft] = useState<ShippingOriginAddress>(initialOrigin);

  const categoryMap = useMemo(
    () => new Map(SHIPPING_CATEGORIES.map((category) => [category.key, category.label])),
    [],
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const [defaultsResponse, originResponse, carriersResponse] = await Promise.all([
          fetch("/api/admin/shipping/defaults", { cache: "no-store" }),
          fetch("/api/admin/shipping/origin", { cache: "no-store" }),
          fetch("/api/admin/shipping/carriers", { cache: "no-store" }),
        ]);

        const defaultsData = await defaultsResponse.json();
        const map: Record<string, ShippingDefaultValues> = {};
        for (const entry of defaultsData.defaults || []) {
          map[entry.category] = {
            shipping_cost_cents: entry.shipping_cost_cents ?? 0,
            default_weight_oz:
              entry.default_weight_oz ?? defaultPackage.default_weight_oz,
            default_length_in:
              entry.default_length_in ?? defaultPackage.default_length_in,
            default_width_in: entry.default_width_in ?? defaultPackage.default_width_in,
            default_height_in:
              entry.default_height_in ?? defaultPackage.default_height_in,
          };
        }
        setShippingDefaults(map);

        const originData = await originResponse.json();
        if (originData.origin) {
          setOriginAddress(originData.origin);
        }

        const carriersData = await carriersResponse.json();
        setEnabledCarriers(carriersData.carriers || []);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_settings_shipping" });
      }
    };

    void loadData();
  }, []);

  const openDefaultsModal = (categoryKey: string) => {
    const current = shippingDefaults[categoryKey] ?? defaultPackage;
    setActiveCategory(categoryKey);
    setDefaultsDraft({ ...current });
    setShippingCostInput(centsToMoneyString(current.shipping_cost_cents));
    setWeightInput(String(current.default_weight_oz));
    setLengthInput(String(current.default_length_in));
    setWidthInput(String(current.default_width_in));
    setHeightInput(String(current.default_height_in));
    setIsDefaultsModalOpen(true);
    setMessage("");
  };

  const closeDefaultsModal = () => {
    setIsDefaultsModalOpen(false);
    setActiveCategory(null);
    setDefaultsDraft(null);
    setShippingCostInput("0.00");
    setWeightInput("16");
    setLengthInput("12");
    setWidthInput("12");
    setHeightInput("12");
  };

  const openOriginModal = () => {
    setOriginDraft({ ...originAddress });
    setIsOriginModalOpen(true);
    setOriginMessage("");
    setOriginError("");
    setOriginErrors({});
  };

  const handleDimensionInput = (
    field: "weight" | "length" | "width" | "height",
    value: string,
  ) => {
    const cleaned = value.replace(/[^\d.]/g, "");

    switch (field) {
      case "weight":
        setWeightInput(cleaned);
        break;
      case "length":
        setLengthInput(cleaned);
        break;
      case "width":
        setWidthInput(cleaned);
        break;
      case "height":
        setHeightInput(cleaned);
        break;
    }

    const numericValue = Number(cleaned);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return;
    }

    setDefaultsDraft((prev) => {
      if (!prev) {
        return prev;
      }

      const fieldMap = {
        height: "default_height_in" as const,
        length: "default_length_in" as const,
        weight: "default_weight_oz" as const,
        width: "default_width_in" as const,
      };

      return { ...prev, [fieldMap[field]]: numericValue };
    });
  };

  const handleShippingCostChange = (value: string) => {
    setShippingCostInput(value);
    const cents = moneyToCents(value);
    setDefaultsDraft((prev) => {
      if (!prev) {
        return prev;
      }
      return { ...prev, shipping_cost_cents: cents };
    });
  };

  const handleOriginDraftChange = (field: keyof ShippingOriginAddress, value: string) => {
    setOriginDraft((prev) => ({ ...prev, [field]: value }));
    if (originErrors[field]) {
      setOriginErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (originError) {
      setOriginError("");
    }
  };

  const toggleCarrier = (carrierKey: string) => {
    setEnabledCarriers((prev) => {
      if (prev.includes(carrierKey)) {
        return prev.filter((carrier) => carrier !== carrierKey);
      }
      return [...prev, carrierKey];
    });
  };

  const saveDefaults = async () => {
    if (!activeCategory || !defaultsDraft) {
      return;
    }

    setIsSavingDefaults(true);
    setMessage("");

    const nextDefaults: Record<string, ShippingDefaultValues> = {
      ...shippingDefaults,
      [activeCategory]: defaultsDraft,
    };

    try {
      const defaults = SHIPPING_CATEGORIES.map((category) => ({
        category: category.key,
        shipping_cost_cents: Math.round(
          nextDefaults[category.key]?.shipping_cost_cents ?? 0,
        ),
        default_weight_oz:
          nextDefaults[category.key]?.default_weight_oz ??
          defaultPackage.default_weight_oz,
        default_length_in:
          nextDefaults[category.key]?.default_length_in ??
          defaultPackage.default_length_in,
        default_width_in:
          nextDefaults[category.key]?.default_width_in ?? defaultPackage.default_width_in,
        default_height_in:
          nextDefaults[category.key]?.default_height_in ??
          defaultPackage.default_height_in,
      }));

      const response = await fetch("/api/admin/shipping/defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaults }),
      });

      if (response.ok) {
        setShippingDefaults(nextDefaults);
        closeDefaultsModal();
        setMessage("Shipping defaults updated.");
      } else {
        const errorData = await response.json();
        setMessage(`Failed to update defaults: ${errorData.error}`);
      }
    } catch {
      setMessage("An unexpected error occurred.");
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const saveOrigin = async () => {
    setIsSavingOrigin(true);
    setOriginMessage("");
    setOriginError("");
    setOriginErrors({});

    const draftErrors = validateOriginDraft(originDraft, message);
    if (Object.keys(draftErrors).length > 0) {
      setOriginErrors(draftErrors);
      setOriginError("Please fix the highlighted fields.");
      setIsSavingOrigin(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/shipping/origin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(originDraft),
      });
      const errorData = await response.json().catch(() => ({}));

      if (response.ok) {
        setOriginAddress(errorData.origin ?? originDraft);
        setIsOriginModalOpen(false);
        setOriginMessage("Shipping origin address saved.");
      } else {
        const fieldErrors = extractOriginErrors(errorData?.issues);
        if (Object.keys(fieldErrors).length > 0) {
          setOriginErrors(fieldErrors);
          setOriginError("Please fix the highlighted fields.");
          return;
        }
        setOriginError(errorData?.error || "Failed to save address.");
      }
    } catch {
      setOriginError("An unexpected error occurred.");
    } finally {
      setIsSavingOrigin(false);
    }
  };

  const saveCarriers = async () => {
    setIsSavingCarriers(true);
    setCarriersMessage("");

    try {
      const response = await fetch("/api/admin/shipping/carriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carriers: enabledCarriers }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setEnabledCarriers(data.carriers || []);
        setCarriersMessage("Enabled carriers updated.");
        setTimeout(() => setCarriersMessage(""), 3000);
      } else {
        setCarriersMessage(`Failed to save carriers: ${data.error}`);
      }
    } catch {
      setCarriersMessage("An unexpected error occurred.");
    } finally {
      setIsSavingCarriers(false);
    }
  };

  const originLine = useMemo(() => {
    const parts = [
      originAddress.line1,
      originAddress.city,
      originAddress.state,
      originAddress.postal_code,
    ].filter(Boolean);
    return parts.join(", ");
  }, [originAddress]);

  const activeCategoryLabel = activeCategory
    ? (categoryMap.get(activeCategory) ?? "")
    : "";

  return {
    activeCategory,
    activeCategoryLabel,
    carriersMessage,
    closeDefaultsModal,
    defaultsDraft,
    enabledCarriers,
    handleDimensionInput,
    handleOriginDraftChange,
    handleShippingCostChange,
    heightInput,
    isDefaultsModalOpen,
    isOriginModalOpen,
    isSavingCarriers,
    isSavingDefaults,
    isSavingOrigin,
    lengthInput,
    message,
    openDefaultsModal,
    openOriginModal,
    originAddress,
    originDraft,
    originError,
    originErrors,
    originLine,
    originMessage,
    saveCarriers,
    saveDefaults,
    saveOrigin,
    setIsOriginModalOpen,
    setShippingCostInput,
    shippingCostInput,
    shippingDefaults,
    toggleCarrier,
    weightInput,
    widthInput,
  };
}
