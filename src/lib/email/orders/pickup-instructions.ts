import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";
import { renderEmailLayout } from "@/lib/email/template";
import { PICKUP_INSTRUCTIONS, PICKUP_LOCATION_SUMMARY } from "@/config/pickup";
import type { PickupInstructionsEmailInput } from "@/lib/email/orders/types";
import { buildEmailFooterText, buildOrderUrl, brandLine } from "@/lib/email/orders/utils";

export const buildPickupInstructionsEmail = (input: PickupInstructionsEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderNumber = `#${orderShort}`;

  const orderUrl = buildOrderUrl(input.orderUrl);
  const locationSummary = input.locationSummary ?? PICKUP_LOCATION_SUMMARY;

  // Inline IG link only (no button)
  const instagramUrl = "https://www.instagram.com/realdealkickzllc/";
  const instagramHandle = "@realdealkickzllc";

  const rawInstructions = input.instructions ?? PICKUP_INSTRUCTIONS;

  // Make any "bring your order number" instruction explicit
  const instructions = rawInstructions.map((line) => {
    const normalized = line.toLowerCase();
    if (normalized.includes("bring your order number")) {
      return line.replace(/bring your order number/gi, `Bring your order number (${orderNumber})`);
    }
    if (normalized.includes("order number") && !line.includes(orderShort)) {
      return `${line} (${orderNumber})`;
    }
    return line;
  });

  const instructionItems = instructions
    .map((line) => `<li style="margin:0 0 8px;">${line}</li>`)
    .join("");

  const instagramLink = `<a href="${instagramUrl}" style="color:${EMAIL_COLORS.text};text-decoration:underline;">${instagramHandle}</a>`;

  const contentHtml = `
    <tr>
      <td style="padding:0 24px 10px;text-align:center;">
        <div style="${emailStyles.eyebrow}">Local pickup</div>
        <h1 style="${emailStyles.heading}">Pickup instructions for order ${orderNumber}</h1>
        <p style="margin:10px 0 0;${emailStyles.copy}">
          We are ready to coordinate your pickup in ${locationSummary}.
        </p>
      </td>
    </tr>

    <!-- SINGLE PANEL: coordination first + next steps -->
    <tr>
      <td style="padding:0 24px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${emailStyles.panel}">
          <tr>
            <td style="padding:16px;">
              <div style="${emailStyles.labelAccent}">Do this first</div>
              <ul style="margin:12px 0 0;padding-left:18px;font-size:13px;line-height:1.7;color:${EMAIL_COLORS.text};">
                <li style="margin:0 0 8px;">
                  <strong>Reply to this email</strong> with 2–3 pickup time windows that work for you.
                </li>
                <li style="margin:0 0 8px;">
                  Prefer Instagram? Message us at ${instagramLink}.
                </li>
                <li style="margin:0 0 8px;">
                  Have your order number ready: <strong>${orderNumber}</strong>.
                </li>
              </ul>

              <div style="height:12px;"></div>

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
  `;

  const html = renderEmailLayout({
    title: "Local Pickup Instructions",
    preheader: `Reply to schedule your pickup — order ${orderNumber}.`,
    contentHtml,
  });

  const lines = [
    brandLine(),
    `Pickup instructions for order ${orderNumber}`,
    "",
    `Pickup location: ${locationSummary}`,
    "",
    "Do this first:",
    `- Reply to this email with 2–3 pickup time windows that work for you.`,
    `- Prefer Instagram? Message us: ${instagramUrl} (${instagramHandle})`,
    `- Have your order number ready: ${orderNumber}.`,
    "",
    "Next steps:",
    ...instructions.map((line) => `- ${line}`),
    "",
    `View your order: ${orderUrl}`,
    "",
    buildEmailFooterText(),
  ];

  return { html, text: lines.join("\n") };
};
