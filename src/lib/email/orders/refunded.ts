// src/lib/email/orders/refunded.ts
import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";
import { renderEmailLayout } from "@/lib/email/template";
import type { OrderRefundedEmailInput } from "@/types/domain/email";
import {
  buildEmailFooterText,
  buildOrderUrl,
  brandLine,
  formatMoney,
} from "@/lib/email/orders/utils";

export const buildOrderRefundedEmail = (input: OrderRefundedEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderUrl = buildOrderUrl(input.orderUrl);

  const contentHtml = `
    <tr>
      <td style="padding:0 24px 10px;text-align:center;">
        <div style="${emailStyles.eyebrow}">Refund processed</div>
        <h1 style="${emailStyles.heading}">Your refund has been issued.</h1>
        <p style="margin:10px 0 0;${emailStyles.copy}">
          The refund should appear in your account within 5-10 business days.
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
            <td style="padding:12px;text-align:right;">
              <div style="${emailStyles.label}">Refund Amount</div>
              <div style="font-size:16px;color:#ffffff;font-weight:700;margin-top:4px;">
                $${formatMoney(input.refundAmount / 100)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px;text-align:left;">
        <a href="${orderUrl}" style="${emailStyles.button}">View your order</a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px;font-size:11px;line-height:1.6;color:${EMAIL_COLORS.subtle};">
        If you have any questions about this refund, reply to this email and our team will help you out.
      </td>
    </tr>
  `;

  const html = renderEmailLayout({
    title: "Refund Processed",
    preheader: `Refund processed for order #${orderShort}.`,
    contentHtml,
  });

  const lines = [
    brandLine(),
    `Order #${orderShort}`,
    `Refund amount: $${formatMoney(input.refundAmount / 100)}`,
    "Your refund has been processed.",
    "The refund should appear in your account within 5-10 business days.",
    "",
    `View your order: ${orderUrl}`,
    buildEmailFooterText(),
  ];

  return { html, text: lines.join("\n") };
};
