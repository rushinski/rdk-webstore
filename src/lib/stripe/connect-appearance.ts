export const connectAppearance = {
  // Fix: drawers behave better on smaller screens than big modal dialogs
  overlays: 'drawer' as const,

  variables: {
    // Typography + spacing (Connect expects fontSizeBase, not fontSize)
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
    fontSizeBase: '14px',
    spacingUnit: '6px',

    // Hard-square everything
    borderRadius: '0px',
    buttonBorderRadius: '0px',
    formBorderRadius: '0px',
    overlayBorderRadius: '0px',

    // Theme (black/white/red)
    colorPrimary: '#dc2626',
    colorBackground: '#000000',
    colorText: '#ffffff',
    colorSecondaryText: '#a1a1aa',
    colorBorder: '#3f3f46',
    colorDanger: '#dc2626',

    // Form surfaces
    formBackgroundColor: '#0a0a0a',
    formHighlightColorBorder: '#dc2626',
    formAccentColor: '#dc2626',
    offsetBackgroundColor: '#111111',

    // Buttons
    buttonPrimaryColorBackground: '#dc2626',
    buttonPrimaryColorBorder: '#dc2626',
    buttonPrimaryColorText: '#ffffff',
    buttonSecondaryColorBackground: '#18181b',
    buttonSecondaryColorBorder: '#3f3f46',
    buttonSecondaryColorText: '#ffffff',

    // Overlay stacking/backdrop
    overlayBackdropColor: 'rgba(0,0,0,0.85)',
    overlayZIndex: 9999,
  },
};
