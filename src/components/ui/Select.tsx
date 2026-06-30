// src/components/ui/Select.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type RdkSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: RdkSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
};

export function RdkSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  searchable = false,
  searchPlaceholder = "Search…",
  className = "",
  buttonClassName = "",
  menuClassName = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const idx = options.findIndex((o) => o.value === value);
    return idx >= 0 ? idx : 0;
  });

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const filteredOptions = useMemo(() => {
    if (!searchable) {
      return options;
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((opt) => {
      const label = opt.label.toLowerCase();
      const valueText = opt.value.toLowerCase();
      return label.includes(query) || valueText.includes(query);
    });
  }, [options, searchable, searchQuery]);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (wrapRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!open) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }

      if (event.key === "ArrowDown") {
        if (filteredOptions.length === 0) {
          return;
        }
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        if (filteredOptions.length === 0) {
          return;
        }
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const opt = filteredOptions[activeIndex];
        if (opt && !opt.disabled) {
          onChange(opt.value);
          setOpen(false);
          buttonRef.current?.focus();
        }
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, activeIndex, onChange, filteredOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const idx = filteredOptions.findIndex((o) => o.value === value);
    if (idx >= 0) {
      setActiveIndex(idx);
    } else if (filteredOptions.length > 0) {
      setActiveIndex(0);
    }
  }, [filteredOptions, value, open]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }
    if (searchable) {
      searchRef.current?.focus();
    }
  }, [open, searchable]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-full flex items-center justify-between gap-2",
          "bg-brand-surface border border-brand-border",
          "px-3 py-2 text-sm text-brand-text",
          "rounded-none",
          "focus:outline-none focus:ring-2 focus:ring-brand-text",
          "disabled:cursor-not-allowed disabled:text-brand-muted",
          buttonClassName,
        ].join(" ")}
      >
        <span
          className={`min-w-0 truncate ${selected ? "text-brand-text" : "text-brand-muted"}`}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-brand-muted" />
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          className={[
            "absolute z-50 mt-2 w-full",
            "bg-brand-surface border border-brand-border shadow-xl",
            "rounded-none overflow-hidden",
            menuClassName,
          ].join(" ")}
        >
          {searchable && (
            <div className="border-b border-brand-border bg-brand-surface p-2">
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-text"
              />
            </div>
          )}
          {filteredOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-brand-muted">No matches</div>
          )}
          {filteredOptions.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === activeIndex;

            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  if (opt.disabled) {
                    return;
                  }
                  onChange(opt.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={[
                  "w-full text-left px-3 py-2 text-sm",
                  "transition",
                  opt.disabled ? "cursor-not-allowed text-brand-muted" : "cursor-pointer",
                  isSelected || isActive
                    ? "bg-brand-text text-brand-surface"
                    : "text-brand-text hover:bg-brand-page",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
