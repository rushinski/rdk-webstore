// src/components/auth/ui/AuthStyles.ts
export const AuthStyles = {
  input:
    "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed",

  inputDisabled:
    "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 text-sm text-zinc-500 cursor-not-allowed",

  primaryButton:
    "h-11 w-full rounded-lg bg-red-600 text-sm font-semibold text-white transition-all hover:bg-red-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600",

  neutralLink:
    "text-sm text-zinc-400 hover:text-white transition-colors",

  accentLink:
    "text-sm font-medium text-red-500 hover:text-red-400 transition-colors",

  inlineAccentLink:
    "font-medium text-red-500 hover:text-red-400 transition-colors",

  errorBox:
    "rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400",

  infoBox:
    "rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400",

  divider:
    "flex items-center gap-3 text-xs text-zinc-600",

  dividerLine:
    "h-px flex-1 bg-zinc-800",
};