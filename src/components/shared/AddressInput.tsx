"use client";

import { useEffect, useState } from "react";

export interface AddressValue {
  name: string;
  phone: string;
  email?: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface AddressInputProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  requirePhone?: boolean;
  requireEmail?: boolean;
  countryCode?: string;
  disabled?: boolean;
  showErrors?: boolean;
}

const labelClass =
  "mb-1 block text-sm font-semibold uppercase tracking-[0.08em] text-brand-text";
const baseInputClass =
  "w-full border bg-brand-surface px-3 py-2.5 text-brand-text outline-none transition-colors placeholder:text-brand-muted disabled:cursor-not-allowed disabled:opacity-60 focus:border-brand-text";

export function AddressInput({
  value,
  onChange,
  requirePhone = false,
  requireEmail = false,
  countryCode = "US",
  disabled = false,
  showErrors = false,
}: AddressInputProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof AddressValue, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof AddressValue, boolean>>>(
    {},
  );

  useEffect(() => {
    const nextErrors: Partial<Record<keyof AddressValue, string>> = {};

    if (!value.name?.trim()) {
      nextErrors.name = "Name is required";
    }

    if (requirePhone && (!value.phone || value.phone.length < 10)) {
      nextErrors.phone = "Phone number required (10+ digits)";
    }

    if (requireEmail && value.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.email)) {
        nextErrors.email = "Valid email address required";
      }
    }

    if (!value.line1?.trim()) {
      nextErrors.line1 = "Street address is required";
    }

    if (!value.city?.trim()) {
      nextErrors.city = "City is required";
    }

    if (!value.state?.trim() || value.state.length !== 2) {
      nextErrors.state = "State must be 2 letters";
    }

    if (!value.postal_code?.trim() || !/^\d{5}(-\d{4})?$/.test(value.postal_code)) {
      nextErrors.postal_code = "Valid ZIP code required";
    }

    setErrors(nextErrors);
  }, [value, requirePhone, requireEmail]);

  const borderClass = (field: keyof AddressValue) =>
    (showErrors || touched[field]) && errors[field]
      ? "border-red-400"
      : "border-brand-border";

  const errorText = (field: keyof AddressValue) =>
    (showErrors || touched[field]) && errors[field] ? (
      <div className="mt-1 text-xs text-red-700">{errors[field]}</div>
    ) : null;

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Full Name *</label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          onBlur={() => setTouched({ ...touched, name: true })}
          disabled={disabled}
          className={`${baseInputClass} ${borderClass("name")}`}
        />
        {errorText("name")}
      </div>

      <div>
        <label className={labelClass}>
          Phone Number {requirePhone ? "*" : "(optional)"}
        </label>
        <input
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          onBlur={() => setTouched({ ...touched, phone: true })}
          disabled={disabled}
          placeholder="(555) 123-4567"
          className={`${baseInputClass} ${borderClass("phone")}`}
        />
        {errorText("phone")}
      </div>

      <div>
        <label className={labelClass}>Email {requireEmail ? "*" : "(optional)"}</label>
        <input
          type="email"
          value={value.email || ""}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          onBlur={() => setTouched({ ...touched, email: true })}
          disabled={disabled}
          placeholder="email@example.com"
          className={`${baseInputClass} ${borderClass("email")}`}
        />
        {errorText("email")}
      </div>

      <div>
        <label className={labelClass}>Street Address *</label>
        <input
          type="text"
          value={value.line1}
          onChange={(e) => onChange({ ...value, line1: e.target.value })}
          onBlur={() => setTouched({ ...touched, line1: true })}
          disabled={disabled}
          placeholder="123 Main St"
          className={`${baseInputClass} ${borderClass("line1")}`}
        />
        {errorText("line1")}
      </div>

      <div>
        <label className={labelClass}>Apartment, suite, etc. (optional)</label>
        <input
          type="text"
          value={value.line2}
          onChange={(e) => onChange({ ...value, line2: e.target.value })}
          disabled={disabled}
          placeholder="Apt 4B"
          className={`${baseInputClass} border-brand-border`}
        />
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="col-span-3">
          <label className={labelClass}>City *</label>
          <input
            type="text"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            onBlur={() => setTouched({ ...touched, city: true })}
            disabled={disabled}
            className={`${baseInputClass} ${borderClass("city")}`}
          />
          {errorText("city")}
        </div>

        <div className="col-span-1">
          <label className={labelClass}>State *</label>
          <input
            type="text"
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value.toUpperCase() })}
            onBlur={() => setTouched({ ...touched, state: true })}
            maxLength={2}
            disabled={disabled}
            placeholder="CA"
            className={`${baseInputClass} ${borderClass("state")} uppercase`}
          />
          {errorText("state")}
        </div>

        <div className="col-span-2">
          <label className={labelClass}>ZIP Code *</label>
          <input
            type="text"
            value={value.postal_code}
            onChange={(e) => onChange({ ...value, postal_code: e.target.value })}
            onBlur={() => setTouched({ ...touched, postal_code: true })}
            disabled={disabled}
            placeholder="12345"
            className={`${baseInputClass} ${borderClass("postal_code")}`}
          />
          {errorText("postal_code")}
        </div>
      </div>

      <input type="hidden" value={value.country || countryCode} />
    </div>
  );
}
