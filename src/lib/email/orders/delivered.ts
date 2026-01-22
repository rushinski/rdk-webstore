// src/lib/email/orders/delivered.ts
import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";
import { renderEmailLayout } from "@/lib/email/template";
import type { OrderDeliveredEmailInput } from "@/types/domain/email";
import {
  buildEmailFooterText,
  buildOrderUrl,
  buildTrackingPanelHtml,
  buildTrackingPanelText,
  brandLine,
} from "@/lib/email/orders/utils";

export const buildOrderDeliveredEmail = (input: OrderDeliveredEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderUrl = buildOrderUrl(input.orderUrl);
  const buttonUrl = input.trackingUrl ?? orderUrl;

  const contentHtml = `
    <tr>
      <td style="padding:0 24px 10px;text-align:center;">
        <div style="${emailStyles.eyebrow}">Delivered</div>
        <h1 style="${emailStyles.heading}">Your order has arrived.</h1>
        <p style="margin:10px 0 0;${emailStyles.copy}">
          If anything looks off, reply to this email and we'll help.
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
        <a href="${buttonUrl}" style="${emailStyles.button}">View tracking</a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px;font-size:11px;line-height:1.6;color:${EMAIL_COLORS.subtle};">
        If you have any questions, reply to this email and our team will help you out.
      </td>
    </tr>
  `;

  const html = renderEmailLayout({
    title: "Order Delivered",
    preheader: `Order #${orderShort} was delivered.`,
    contentHtml,
  });

  const lines = [
    brandLine(),
    `Order #${orderShort}`,
    "Your order was delivered.",
    buildTrackingPanelText(input),
    "",
    `View your order: ${orderUrl}`,
    buildEmailFooterText(),
  ].filter(Boolean);

  return { html, text: lines.join("\n") };
};
