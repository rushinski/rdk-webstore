// src/components/auth/ui/authStyles.ts

export const authStyles = {
  badge:
    "inline-flex items-center justify-center rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-500",

  heading: "text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50",
  subheading: "text-xs sm:text-sm text-neutral-500 dark:text-neutral-400",

  input:
    "h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none transition focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60",

  inputDisabled:
    "h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 px-3 text-sm text-neutral-800 dark:text-neutral-100 shadow-sm outline-none disabled:cursor-not-allowed disabled:opacity-80",

  primaryButton:
    "inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-500 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-60",

  neutralLink:
    "text-xs sm:text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50 underline underline-offset-2",

  // Underlined “accent” link (good for standalone actions)
  accentLink:
    "font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 underline underline-offset-2",

  // Inline accent link (no underline) — used inside sentences like:
  // “Don’t have an account? Create one”
  inlineAccentLink:
    "font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300",

  errorBox:
    "rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400",

  infoBox:
    "rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300",
};
