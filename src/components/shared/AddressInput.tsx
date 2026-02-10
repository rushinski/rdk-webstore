"use client";

import { useState, useEffect } from "react";

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
  showErrors?: boolean; // Controls when to display validation errors
}

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

  // Client-side validation
  useEffect(() => {
    const newErrors: Partial<Record<keyof AddressValue, string>> = {};

    if (!value.name?.trim()) {
      newErrors.name = "Name is required";
    }

    if (requirePhone && (!value.phone || value.phone.length < 10)) {
      newErrors.phone = "Phone number required (10+ digits)";
    }

    if (requireEmail && value.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.email)) {
        newErrors.email = "Valid email address required";
      }
    }

    if (!value.line1?.trim()) {
      newErrors.line1 = "Street address is required";
    }

    if (!value.city?.trim()) {
      newErrors.city = "City is required";
    }

    if (!value.state?.trim() || value.state.length !== 2) {
      newErrors.state = "State must be 2 letters";
    }

    if (!value.postal_code?.trim() || !/^\d{5}(-\d{4})?$/.test(value.postal_code)) {
      newErrors.postal_code = "Valid ZIP code required";
    }

    setErrors(newErrors);
  }, [value, requirePhone, requireEmail]);

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          onBlur={() => setTouched({ ...touched, name: true })}
          disabled={disabled}
          className={`w-full px-3 py-2.5 bg-zinc-950 border rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 ${
            (showErrors || touched.name) && errors.name
              ? "border-red-500"
              : "border-zinc-800"
          }`}
        />
        {(showErrors || touched.name) && errors.name && (
          <div className="text-xs text-red-400 mt-1">{errors.name}</div>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Phone Number {requirePhone ? "*" : "(optional)"}
        </label>
        <input
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          onBlur={() => setTouched({ ...touched, phone: true })}
          disabled={disabled}
          placeholder="(555) 123-4567"
          className={`w-full px-3 py-2.5 bg-zinc-950 border rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 ${
            (showErrors || touched.phone) && errors.phone
              ? "border-red-500"
              : "border-zinc-800"
          }`}
        />
        {(showErrors || touched.phone) && errors.phone && (
          <div className="text-xs text-red-400 mt-1">{errors.phone}</div>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Email {requireEmail ? "*" : "(optional)"}
        </label>
        <input
          type="email"
          value={value.email || ""}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          onBlur={() => setTouched({ ...touched, email: true })}
          disabled={disabled}
          placeholder="email@example.com"
          className={`w-full px-3 py-2.5 bg-zinc-950 border rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 ${
            (showErrors || touched.email) && errors.email
              ? "border-red-500"
              : "border-zinc-800"
          }`}
        />
        {(showErrors || touched.email) && errors.email && (
          <div className="text-xs text-red-400 mt-1">{errors.email}</div>
        )}
      </div>

      {/* Address Line 1 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Street Address *
        </label>
        <input
          type="text"
          value={value.line1}
          onChange={(e) => onChange({ ...value, line1: e.target.value })}
          onBlur={() => setTouched({ ...touched, line1: true })}
          disabled={disabled}
          placeholder="123 Main St"
          className={`w-full px-3 py-2.5 bg-zinc-950 border rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 ${
            (showErrors || touched.line1) && errors.line1
              ? "border-red-500"
              : "border-zinc-800"
          }`}
        />
        {(showErrors || touched.line1) && errors.line1 && (
          <div className="text-xs text-red-400 mt-1">{errors.line1}</div>
        )}
      </div>

      {/* Address Line 2 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Apartment, suite, etc. (optional)
        </label>
        <input
          type="text"
          value={value.line2}
          onChange={(e) => onChange({ ...value, line2: e.target.value })}
          disabled={disabled}
          placeholder="Apt 4B"
          className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      {/* City, State, ZIP */}
      <div className="grid grid-cols-6 gap-4">
        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-300 mb-1">City *</label>
          <input
            type="text"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            onBlur={() => setTouched({ ...touched, city: true })}
            disabled={disabled}
            className={`w-full px-3 py-2.5 bg-zinc-950 border rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 ${
              (showErrors || touched.city) && errors.city
                ? "border-red-500"
                : "border-zinc-800"
            }`}
          />
          {(showErrors || touched.city) && errors.city && (
            <div className="text-xs text-red-400 mt-1">{errors.city}</div>
          )}
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">State *</label>
          <input
            type="text"
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value.toUpperCase() })}
            onBlur={() => setTouched({ ...touched, state: true })}
            maxLength={2}
            disabled={disabled}
            placeholder="CA"
            className={`w-full px-3 py-2.5 bg-zinc-950 border rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 uppercase ${
              (showErrors || touched.state) && errors.state
                ? "border-red-500"
                : "border-zinc-800"
            }`}
          />
          {(showErrors || touched.state) && errors.state && (
            <div className="text-xs text-red-400 mt-1">{errors.state}</div>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            ZIP Code *
          </label>
          <input
            type="text"
            value={value.postal_code}
            onChange={(e) => onChange({ ...value, postal_code: e.target.value })}
            onBlur={() => setTouched({ ...touched, postal_code: true })}
            disabled={disabled}
            placeholder="12345"
            className={`w-full px-3 py-2.5 bg-zinc-950 border rounded text-white focus:outline-none focus:ring-2 focus:ring-red-600 ${
              (showErrors || touched.postal_code) && errors.postal_code
                ? "border-red-500"
                : "border-zinc-800"
            }`}
          />
          {(showErrors || touched.postal_code) && errors.postal_code && (
            <div className="text-xs text-red-400 mt-1">{errors.postal_code}</div>
          )}
        </div>
      </div>

      {/* Country (hidden, always US for now) */}
      <input type="hidden" value={value.country || countryCode} />
    </div>
  );
}
