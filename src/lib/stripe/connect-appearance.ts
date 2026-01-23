// src/lib/stripe/connect-appearance.ts
export const connectAppearance = {
  // Prefer modal-style overlays to match our UI (avoid “squeezed” drawer UX)
  overlays: "dialog" as const,

  variables: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans"',
    fontSizeBase: "14px",
    spacingUnit: "8px",

    // match your rounded-sm
    borderRadius: "2px",
    buttonBorderRadius: "2px",
    formBorderRadius: "2px",
    overlayBorderRadius: "2px",

    colorPrimary: "#dc2626",
    colorBackground: "#0a0a0a",
    colorText: "#ffffff",
    colorSecondaryText: "#a1a1aa",
    colorBorder: "#27272a",
    colorDanger: "#dc2626",

    formBackgroundColor: "#0a0a0a",
    offsetBackgroundColor: "#09090b",

    buttonPrimaryColorBackground: "#dc2626",
    buttonPrimaryColorBorder: "#dc2626",
    buttonPrimaryColorText: "#ffffff",
    buttonSecondaryColorBackground: "#18181b",
    buttonSecondaryColorBorder: "#27272a",
    buttonSecondaryColorText: "#ffffff",

    overlayBackdropColor: "rgba(0,0,0,0.75)",
    overlayZIndex: 9999,
  },
};
