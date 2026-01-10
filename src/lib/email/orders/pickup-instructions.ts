import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";
import { renderEmailLayout } from "@/lib/email/template";
import { PICKUP_INSTRUCTIONS, PICKUP_LOCATION_SUMMARY } from "@/config/pickup";
import type { PickupInstructionsEmailInput } from "@/lib/email/orders/types";
import { buildEmailFooterText, buildOrderUrl, brandLine } from "@/lib/email/orders/utils";

export const buildPickupInstructionsEmail = (input: PickupInstructionsEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderUrl = buildOrderUrl(input.orderUrl);
  const instructions = input.instructions ?? PICKUP_INSTRUCTIONS;
  const locationSummary = input.locationSummary ?? PICKUP_LOCATION_SUMMARY;

  const instructionItems = instructions
    .map((line) => `<li style="margin:0 0 8px;">${line}</li>`)
    .join("");

  const contentHtml = `
    <tr>
      <td style="padding:0 24px 10px;text-align:center;">
        <div style="${emailStyles.eyebrow}">Local pickup</div>
        <h1 style="${emailStyles.heading}">Pickup instructions for order #${orderShort}</h1>
        <p style="margin:10px 0 0;${emailStyles.copy}">
          We are ready to coordinate your pickup in ${locationSummary}.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${emailStyles.panel}">
          <tr>
            <td style="padding:16px;">
              <div style="${emailStyles.labelAccent}">Next steps</div>
              <ul style="margin:12px 0 0;padding-left:18px;font-size:13px;line-height:1.7;color:${EMAIL_COLORS.text};">
                ${instructionItems}
              </ul>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px;text-align:left;">
        <a href="${orderUrl}" style="${emailStyles.button}">View order status</a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px;font-size:11px;line-height:1.6;color:${EMAIL_COLORS.subtle};">
        Reply to this email to coordinate your pickup time.
      </td>
    </tr>
  `;

  const html = renderEmailLayout({
    title: "Local Pickup Instructions",
    preheader: `Pickup instructions for order #${orderShort}.`,
    contentHtml,
  });

  const lines = [
    brandLine(),
    `Pickup instructions for order #${orderShort}`,
    "",
    `Pickup location: ${locationSummary}`,
    "",
    "Next steps:",
    ...instructions.map((line) => `- ${line}`),
    "",
    `View your order: ${orderUrl}`,
    "",
    "Reply to this email to coordinate your pickup time.",
    buildEmailFooterText(),
  ];

  return { html, text: lines.join("\n") };
};
