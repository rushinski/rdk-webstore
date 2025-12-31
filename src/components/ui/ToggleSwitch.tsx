"use client";

import type { KeyboardEvent } from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: ToggleSwitchProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (disabled) return;
    onChange(!checked);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      onKeyDown={handleKeyDown}
      data-state={checked ? "on" : "off"}
      className="rdk-toggle"
    >
      <span className="rdk-toggle__thumb" />
    </button>
  );
}
