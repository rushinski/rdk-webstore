// src/lib/email/theme.ts
import { BRAND_LOGO_URL, BRAND_NAME } from "@/config/constants/brand";

export const EMAIL_BRAND = {
  name: BRAND_NAME,
  logoUrl: BRAND_LOGO_URL,
};

export const EMAIL_FONT_STACK = "'Inter', 'Helvetica Neue', Arial, Helvetica, sans-serif";

export const EMAIL_COLORS = {
  background: "#000000",
  surface: "#0b0b0c",
  border: "#1f1f22",
  panel: "#111114",
  panelBorder: "#262626",
  text: "#f5f5f5",
  muted: "#9ca3af",
  subtle: "#6b7280",
  accent: "#dc2626",
};

export const emailStyles = {
  body: `margin:0;padding:0;background:${EMAIL_COLORS.background};color:${EMAIL_COLORS.text};font-family:${EMAIL_FONT_STACK};`,
  outerTable: `background:${EMAIL_COLORS.background};padding:32px 12px;`,
  container: `width:100%;background:${EMAIL_COLORS.surface};border:1px solid ${EMAIL_COLORS.border};border-top:2px solid ${EMAIL_COLORS.accent};`,
  logoCell: "padding:22px 24px 14px;text-align:center;",
  logo: "max-width:180px;width:100%;height:auto;display:block;margin:0 auto;",
  preheader:
    "display:none;font-size:1px;line-height:1px;color:#000000;max-height:0;max-width:0;opacity:0;overflow:hidden;",
  eyebrow: `font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${EMAIL_COLORS.accent};font-weight:700;`,
  heading:
    "margin:10px 0 0;font-size:20px;line-height:1.4;font-weight:700;color:#ffffff;",
  copy: `margin:0;font-size:14px;line-height:1.7;color:${EMAIL_COLORS.muted};`,
  subcopy: `margin:0;font-size:12px;line-height:1.6;color:${EMAIL_COLORS.subtle};`,
  panel: `background:${EMAIL_COLORS.panel};border:1px solid ${EMAIL_COLORS.panelBorder};`,
  label: `font-size:11px;color:${EMAIL_COLORS.muted};text-transform:uppercase;letter-spacing:0.22em;`,
  labelAccent: `font-size:11px;color:${EMAIL_COLORS.accent};text-transform:uppercase;letter-spacing:0.22em;font-weight:700;`,
  button: `display:inline-block;background:${EMAIL_COLORS.accent};color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 22px;border:1px solid ${EMAIL_COLORS.accent};`,
  divider: `border-bottom:1px solid ${EMAIL_COLORS.border};`,
  link: `color:${EMAIL_COLORS.muted};text-decoration:none;`,
  accentLink: `color:${EMAIL_COLORS.accent};text-decoration:none;`,
  code: "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;",
};
