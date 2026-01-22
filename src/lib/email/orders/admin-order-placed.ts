// src/lib/email/orders/admin-order-placed.ts
import { env } from "@/config/env";
import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";
import { renderEmailLayout } from "@/lib/email/template";
import type { AdminOrderPlacedEmailInput } from "@/types/domain/email";
import { brandLine, buildEmailFooterText, formatMoney } from "@/lib/email/orders/utils";

const buildAdminOrderUrl = (input: AdminOrderPlacedEmailInput) =>
  input.orderUrl ?? `${env.NEXT_PUBLIC_SITE_URL}/admin/sales`;

export const buildAdminOrderPlacedEmail = (input: AdminOrderPlacedEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderUrl = buildAdminOrderUrl(input);
  const fulfillmentLabel = input.fulfillment === "pickup" ? "Local pickup" : "Shipping";
  const itemLabel = `${input.itemCount} item${input.itemCount === 1 ? "" : "s"}`;
  const customerLabel = input.customerEmail?.trim() || "Guest checkout";

  const contentHtml = `
    <tr>
      <td style="padding:0 24px 10px;text-align:center;">
        <div style="${emailStyles.eyebrow}">New order placed</div>
        <h1 style="${emailStyles.heading}">Order #${orderShort} just came in.</h1>
        <p style="margin:10px 0 0;${emailStyles.copy}">
          ${customerLabel} placed a new order for ${itemLabel}.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${emailStyles.panel}">
          <tr>
            <td style="padding:12px;">
              <div style="${emailStyles.label}">Fulfillment</div>
              <div style="font-size:15px;color:#ffffff;font-weight:600;margin-top:4px;">
                ${fulfillmentLabel}
              </div>
            </td>
            <td style="padding:12px;text-align:right;">
              <div style="${emailStyles.label}">Total</div>
              <div style="font-size:16px;color:#ffffff;font-weight:700;margin-top:4px;">
                $${formatMoney(input.total)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-top:1px solid ${EMAIL_COLORS.panelBorder};">
              <div style="${emailStyles.label}">Items</div>
              <div style="font-size:14px;color:#ffffff;margin-top:4px;">
                ${itemLabel}
              </div>
            </td>
            <td style="padding:12px;text-align:right;border-top:1px solid ${EMAIL_COLORS.panelBorder};">
              <div style="${emailStyles.label}">Tax</div>
              <div style="font-size:14px;color:#ffffff;margin-top:4px;">
                $${formatMoney(input.tax)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-top:1px solid ${EMAIL_COLORS.panelBorder};">
              <div style="${emailStyles.label}">Subtotal</div>
              <div style="font-size:14px;color:#ffffff;margin-top:4px;">
                $${formatMoney(input.subtotal)}
              </div>
            </td>
            <td style="padding:12px;text-align:right;border-top:1px solid ${EMAIL_COLORS.panelBorder};">
              <div style="${emailStyles.label}">Shipping</div>
              <div style="font-size:14px;color:#ffffff;margin-top:4px;">
                $${formatMoney(input.shipping)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px;text-align:center;">
        <a href="${orderUrl}" style="${emailStyles.button}">Open admin sales</a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px;font-size:11px;line-height:1.6;color:${EMAIL_COLORS.subtle};">
        You can manage order notification preferences in your admin profile.
      </td>
    </tr>
  `;

  const html = renderEmailLayout({
    title: "New order placed",
    preheader: `Order #${orderShort} placed (${itemLabel}).`,
    contentHtml,
  });

  const lines = [
    brandLine(),
    `New order placed: #${orderShort}`,
    `Customer: ${customerLabel}`,
    `Fulfillment: ${fulfillmentLabel}`,
    `Items: ${itemLabel}`,
    `Subtotal: $${formatMoney(input.subtotal)}`,
    `Tax: $${formatMoney(input.tax)}`,
    `Shipping: $${formatMoney(input.shipping)}`,
    `Total: $${formatMoney(input.total)}`,
    "",
    `Open admin sales: ${orderUrl}`,
    buildEmailFooterText(),
  ];

  return { html, text: lines.join("\n") };
};
