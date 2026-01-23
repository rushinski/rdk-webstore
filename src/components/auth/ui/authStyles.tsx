// src/components/auth/ui/AuthStyles.ts
export const AuthStyles = {
  input:
    "h-11 w-full bg-zinc-900 border border-zinc-800 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",

  inputDisabled:
    "h-11 w-full bg-zinc-900/50 border border-zinc-800 px-4 text-sm text-zinc-500 cursor-not-allowed",

  primaryButton:
    "h-11 w-full bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600",

  neutralLink: "text-sm text-zinc-400 hover:text-white transition-colors",

  accentLink: "text-sm font-medium text-red-600 hover:text-red-500 transition-colors",

  inlineAccentLink: "font-medium text-red-600 hover:text-red-500 transition-colors",

  errorBox: "border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-400",

  infoBox:
    "border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-400",

  divider: "flex items-center gap-3 text-xs text-zinc-600",

  dividerLine: "h-px flex-1 bg-zinc-800",
};
