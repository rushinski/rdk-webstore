import { env } from "@/config/env";
import { BRAND_NAME } from "@/config/constants/brand";
import { emailFooterText } from "@/lib/email/footer";
import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";
import type { OrderTrackingEmailBase, ShippingAddress } from "@/types/domain/email";

export const formatMoney = (value: number) => value.toFixed(2);

const formatLine = (value?: string | null) => (value ? value.trim() : "");

export const buildAddressLines = (address?: ShippingAddress | null) => {
  if (!address) return [];
  const lines = [
    formatLine(address.name),
    formatLine(address.line1),
    formatLine(address.line2),
    [formatLine(address.city), formatLine(address.state), formatLine(address.postalCode)]
      .filter(Boolean)
      .join(", ")
      .trim(),
    formatLine(address.country),
  ];
  return lines.filter(Boolean);
};

export const buildOrderUrl = (orderUrl?: string | null) =>
  orderUrl ?? `${env.NEXT_PUBLIC_SITE_URL}/account`;

export const buildEmailFooterText = () => emailFooterText();

export const brandLine = () => BRAND_NAME;

export const buildTrackingPanelHtml = (input: OrderTrackingEmailBase) => {
  const carrierLabel = input.carrier ?? "Carrier";
  const trackingLabel = input.trackingNumber ?? "Tracking details will be shared soon.";
  const trackingUrl = input.trackingUrl ?? null;

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${emailStyles.panel}">
      <tr>
        <td style="padding:12px;">
          <div style="${emailStyles.label}">Carrier</div>
          <div style="font-size:14px;color:#ffffff;margin-top:4px;">
            ${carrierLabel}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px;border-top:1px solid ${EMAIL_COLORS.panelBorder};">
          <div style="${emailStyles.label}">Tracking</div>
          <div style="font-size:14px;color:#ffffff;margin-top:4px;">
            ${trackingUrl ? `<a href="${trackingUrl}" style="${emailStyles.accentLink}">${trackingLabel}</a>` : trackingLabel}
          </div>
        </td>
      </tr>
    </table>
  `;
};

export const buildTrackingPanelText = (input: OrderTrackingEmailBase) => {
  const lines: string[] = [];
  if (input.carrier) lines.push(`Carrier: ${input.carrier}`);
  if (input.trackingNumber) lines.push(`Tracking: ${input.trackingNumber}`);
  if (input.trackingUrl) lines.push(`Track: ${input.trackingUrl}`);
  return lines.join("\n");
};
