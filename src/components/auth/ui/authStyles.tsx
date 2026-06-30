// src/components/auth/ui/AuthStyles.ts
export const authStyles = {
  input:
    "h-11 w-full border border-brand-border bg-brand-surface px-4 text-sm text-brand-text placeholder:text-brand-muted outline-none transition-colors focus:border-brand-text disabled:cursor-not-allowed disabled:opacity-50",

  inputDisabled:
    "h-11 w-full cursor-not-allowed border border-brand-border bg-brand-page px-4 text-sm text-brand-muted",

  primaryButton:
    "h-11 w-full border border-brand-text bg-brand-text text-sm font-semibold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-400 disabled:hover:bg-neutral-400",

  neutralLink: "text-sm text-brand-muted transition-colors hover:text-brand-text",

  accentLink:
    "text-sm font-medium text-brand-text transition-colors hover:text-neutral-600",

  inlineAccentLink:
    "font-medium text-brand-text transition-colors hover:text-neutral-600",

  errorBox: "border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700",

  infoBox: "border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700",

  divider: "flex items-center gap-3 text-xs text-brand-muted",

  dividerLine: "h-px flex-1 bg-brand-border",
};
