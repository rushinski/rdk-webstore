// src/lib/email/orders/label-created.ts
import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";
import { renderEmailLayout } from "@/lib/email/template";
import type { OrderLabelCreatedEmailInput } from "@/lib/email/orders/types";
import {
  buildEmailFooterText,
  buildOrderUrl,
  buildTrackingPanelHtml,
  buildTrackingPanelText,
  brandLine,
} from "@/lib/email/orders/utils";

export const buildOrderLabelCreatedEmail = (input: OrderLabelCreatedEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderUrl = buildOrderUrl(input.orderUrl);
  const buttonUrl = input.trackingUrl ?? orderUrl;
  const buttonLabel = input.trackingUrl ? "Track your package" : "View your order";
  const trackingNumber = input.trackingNumber ? ` (${input.trackingNumber})` : "";

  const contentHtml = `
    <tr>
      <td style="padding:0 24px 10px;text-align:center;">
        <div style="${emailStyles.eyebrow}">Label created</div>
        <h1 style="${emailStyles.heading}">We're preparing your shipment.${trackingNumber}</h1>
        <p style="margin:10px 0 0;${emailStyles.copy}">
          Your shipping label has been created. Tracking may take a bit to update until the carrier scans the package.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${emailStyles.panel}">
          <tr>
            <td style="padding:12px;">
              <div style="${emailStyles.label}">Order</div>
              <div style="font-size:16px;color:#ffffff;font-weight:700;margin-top:4px;">
                #${orderShort}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 16px;">
        ${buildTrackingPanelHtml(input)}
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px;text-align:left;">
        <a href="${buttonUrl}" style="${emailStyles.button}">${buttonLabel}</a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px;font-size:11px;line-height:1.6;color:${EMAIL_COLORS.subtle};">
        If you have any questions, reply to this email and our team will help you out.
      </td>
    </tr>
  `;

  const html = renderEmailLayout({
    title: "Label Created",
    preheader: `Shipping label created for order #${orderShort}.`,
    contentHtml,
  });

  const lines = [
    brandLine(),
    `Order #${orderShort}`,
    "Your shipping label has been created.",
    "Tracking may take a bit to update until the carrier scans the package.",
    buildTrackingPanelText(input),
    "",
    `View your order: ${orderUrl}`,
    buildEmailFooterText(),
  ].filter(Boolean);

  return { html, text: lines.join("\n") };
};
