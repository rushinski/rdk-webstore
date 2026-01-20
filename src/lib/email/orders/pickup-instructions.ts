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
  const instagramLinkHtml = `<a href="${instagramUrl}" style="color:${EMAIL_COLORS.text};text-decoration:underline;">${instagramHandle}</a>`;

  const rawInstructions = input.instructions ?? PICKUP_INSTRUCTIONS;

  // Remove scheduling-type lines from the config instructions to avoid duplicates
  const schedulingDupes = /(appointment|reply to this email|schedule|pickup time|time windows|dm|instagram)/i;

  // Remove the specific line you want gone (and close variants of it)
  const removeLine = /(government-?issued id|bring a government|bring your id)/i;

  const baseInstructions = rawInstructions.filter(
    (line) => !schedulingDupes.test(line) && !removeLine.test(line)
  );

  // (Optional) If any remaining instruction says "bring your order number", make it explicit.
  // If you don't want any "what to bring" bullets at all, you can delete this map().
  const instructions = baseInstructions.map((line) => {
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

  // Clear, non-redundant bullets
  const actionItemsHtml = [
    `<li style="margin:0 0 8px;"><strong>Pickup location:</strong> ${locationSummary}</li>`,
    `<li style="margin:0 0 8px;"><strong>Reply to this email</strong> or DM us on Instagram ${instagramLinkHtml} to schedule a pickup. Include your order number (<strong>${orderNumber}</strong>) and 2–3 times that work for you.</li>`,
    `<li style="margin:0 0 8px;">We’ll reply to confirm if one of your requested times works. If not, we’ll предложe an available time and coordinate from there.</li>`,
    `<li style="margin:0 0 8px;">Please have your <strong>order confirmation email</strong> available to show at pickup.</li>`,
  ].join("");

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

    <tr>
      <td style="padding:0 24px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${emailStyles.panel}">
          <tr>
            <td style="padding:16px;">
              <div style="${emailStyles.labelAccent}">Action required</div>
              <ul style="margin:12px 0 0;padding-left:18px;font-size:13px;line-height:1.7;color:${EMAIL_COLORS.text};">
                ${actionItemsHtml}
              </ul>

              ${
                instructions.length
                  ? `
                <div style="height:10px;"></div>
                <div style="${emailStyles.labelAccent}">Pickup notes</div>
                <ul style="margin:12px 0 0;padding-left:18px;font-size:13px;line-height:1.7;color:${EMAIL_COLORS.text};">
                  ${instructionItems}
                </ul>
              `
                  : ""
              }
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
    preheader: `Reply or DM to schedule pickup — order ${orderNumber}.`,
    contentHtml,
  });

  const lines = [
    brandLine(),
    `Pickup instructions for order ${orderNumber}`,
    "",
    `Pickup location: ${locationSummary}`,
    "",
    "Action required:",
    `- Reply to this email or DM us on Instagram to schedule: ${instagramUrl} (${instagramHandle}). Include ${orderNumber} and 2–3 times that work for you.`,
    `- We’ll reply to confirm if one of your requested times works. If not, we’ll suggest an available time and coordinate from there.`,
    `- Please have your order confirmation email available to show at pickup.`,
    "",
    ...(instructions.length ? ["Pickup notes:", ...instructions.map((line) => `- ${line}`), ""] : []),
    `View your order: ${orderUrl}`,
    "",
    buildEmailFooterText(),
  ];

  return { html, text: lines.join("\n") };
};
