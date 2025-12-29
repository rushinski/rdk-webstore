import { env } from "@/config/env";
import { sendEmail } from "@/lib/email/mailer";

type OrderItemEmail = {
  title: string;
  sizeLabel?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type ShippingAddress = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

type OrderConfirmationEmailInput = {
  to: string;
  orderId: string;
  createdAt: string;
  fulfillment: "ship" | "pickup";
  currency: string;
  subtotal: number;
  shipping: number;
  total: number;
  items: OrderItemEmail[];
  shippingAddress?: ShippingAddress | null;
};

const formatMoney = (value: number) => value.toFixed(2);

const formatLine = (value?: string | null) => (value ? value.trim() : "");

const buildAddressLines = (address?: ShippingAddress | null) => {
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

const buildEmailHtml = (input: OrderConfirmationEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderDate = new Date(input.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const addressLines = buildAddressLines(input.shippingAddress);
  const orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/account`;

  const itemsHtml = input.items
    .map((item) => {
      const size = item.sizeLabel ? ` (${item.sizeLabel})` : "";
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #262626;">
            <div style="font-size:14px;color:#f5f5f5;font-weight:600;">${item.title}${size}</div>
            <div style="font-size:12px;color:#9ca3af;">Qty ${item.quantity}</div>
          </td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #262626;font-size:14px;color:#f5f5f5;">
            $${formatMoney(item.lineTotal)}
          </td>
        </tr>
      `;
    })
    .join("");

  const shippingBlock =
    input.fulfillment === "ship" && addressLines.length > 0
      ? `
        <tr>
          <td style="padding:16px 0 0;">
            <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#f87171;font-weight:700;">
              Shipping Address
            </div>
            <div style="margin-top:8px;font-size:13px;line-height:1.6;color:#d1d5db;">
              ${addressLines.map((line) => `<div>${line}</div>`).join("")}
            </div>
          </td>
        </tr>
      `
      : `
        <tr>
          <td style="padding:16px 0 0;">
            <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#f87171;font-weight:700;">
              Fulfillment
            </div>
            <div style="margin-top:8px;font-size:13px;line-height:1.6;color:#d1d5db;">
              ${input.fulfillment === "pickup" ? "Store pickup" : "Shipping details pending"}
            </div>
          </td>
        </tr>
      `;

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Order Confirmation</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
    </head>
    <body style="margin:0;padding:0;background:#050505;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:32px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#0b0b0c;border:1px solid #1f1f22;">
              <tr>
                <td style="padding:24px 24px 8px;text-align:center;">
                  <img
                    src="https://fbwosmpjzbpojsftydwn.supabase.co/storage/v1/object/public/assets/rdk-logo.png"
                    alt="Real Deal Kickz"
                    style="max-width:200px;width:100%;height:auto;display:block;margin:0 auto;"
                  />
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 16px;text-align:center;">
                  <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#f87171;font-weight:700;">
                    Order Confirmed
                  </div>
                  <h1 style="margin:10px 0 0;font-size:22px;font-weight:700;color:#ffffff;">
                    Thanks for shopping with us.
                  </h1>
                  <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                    Your order is locked in and we are preparing it now.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 16px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111114;border:1px solid #262626;">
                    <tr>
                      <td style="padding:12px;">
                        <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.14em;">
                          Order
                        </div>
                        <div style="font-size:16px;color:#ffffff;font-weight:700;margin-top:4px;">
                          #${orderShort}
                        </div>
                      </td>
                      <td style="padding:12px;text-align:right;">
                        <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.14em;">
                          Placed
                        </div>
                        <div style="font-size:14px;color:#ffffff;margin-top:4px;">
                          ${orderDate}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    ${itemsHtml}
                    <tr>
                      <td style="padding:12px 0 4px;font-size:13px;color:#9ca3af;">Subtotal</td>
                      <td align="right" style="padding:12px 0 4px;font-size:13px;color:#d1d5db;">
                        $${formatMoney(input.subtotal)}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 4px;font-size:13px;color:#9ca3af;">Shipping</td>
                      <td align="right" style="padding:0 0 4px;font-size:13px;color:#d1d5db;">
                        $${formatMoney(input.shipping)}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 12px;font-size:14px;color:#ffffff;font-weight:700;border-bottom:1px solid #262626;">
                        Total
                      </td>
                      <td align="right" style="padding:0 0 12px;font-size:16px;color:#ffffff;font-weight:700;border-bottom:1px solid #262626;">
                        $${formatMoney(input.total)}
                      </td>
                    </tr>
                    ${shippingBlock}
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;">
                  <a href="${orderUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;">
                    View your order
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px;font-size:11px;color:#6b7280;line-height:1.5;">
                  If you have any questions, reply to this email and our team will help you out.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const buildEmailText = (input: OrderConfirmationEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderDate = new Date(input.createdAt).toLocaleDateString("en-US");
  const addressLines = buildAddressLines(input.shippingAddress);

  const lines = [
    "Real Deal Kickz",
    `Order #${orderShort}`,
    `Placed: ${orderDate}`,
    "",
    "Items:",
    ...input.items.map((item) => {
      const size = item.sizeLabel ? ` (${item.sizeLabel})` : "";
      return `- ${item.title}${size} x${item.quantity} - $${formatMoney(item.lineTotal)}`;
    }),
    "",
    `Subtotal: $${formatMoney(input.subtotal)}`,
    `Shipping: $${formatMoney(input.shipping)}`,
    `Total: $${formatMoney(input.total)}`,
  ];

  if (input.fulfillment === "ship") {
    lines.push("", "Shipping Address:", ...addressLines);
  } else {
    lines.push("", "Fulfillment: Store pickup");
  }

  lines.push("", `View your order: ${env.NEXT_PUBLIC_SITE_URL}/account`);

  return lines.join("\n");
};

export class OrderEmailService {
  async sendOrderConfirmation(input: OrderConfirmationEmailInput) {
    if (!input.to) return;
    await sendEmail({
      to: input.to,
      subject: "Your Real Deal Kickz order is confirmed",
      html: buildEmailHtml(input),
      text: buildEmailText(input),
    });
  }
}
