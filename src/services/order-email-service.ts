// src/services/order-email-service.ts
import { env } from "@/config/env";
import { sendEmail } from "@/lib/email/mailer";
import { emailFooterText } from "@/lib/email/footer";
import { renderEmailLayout } from "@/lib/email/template";
import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";

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

type OrderTrackingEmailBase = {
  to: string;
  orderId: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

type OrderLabelCreatedEmailInput = OrderTrackingEmailBase;
type OrderInTransitEmailInput = OrderTrackingEmailBase;
type OrderDeliveredEmailInput = OrderTrackingEmailBase;
type OrderRefundedEmailInput = {
  to: string;
  orderId: string;
  refundAmount: number;
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

// Order Confirmation
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
          <td style="padding:12px 0;border-bottom:1px solid ${EMAIL_COLORS.panelBorder};">
            <div style="font-size:14px;color:${EMAIL_COLORS.text};font-weight:600;">${item.title}${size}</div>
            <div style="font-size:12px;color:${EMAIL_COLORS.muted};">Qty ${item.quantity}</div>
          </td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid ${EMAIL_COLORS.panelBorder};font-size:14px;color:${EMAIL_COLORS.text};">
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
            <div style="${emailStyles.labelAccent}">Shipping Address</div>
            <div style="margin-top:8px;font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};">
              ${addressLines.map((line) => `<div>${line}</div>`).join("")}
            </div>
          </td>
        </tr>
      `
      : `
        <tr>
          <td style="padding:16px 0 0;">
            <div style="${emailStyles.labelAccent}">Fulfillment</div>
            <div style="margin-top:8px;font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};">
              ${input.fulfillment === "pickup" ? "Store pickup" : "Shipping details pending"}
            </div>
          </td>
        </tr>
      `;

  const contentHtml = `
      <tr>
        <td style="padding:0 24px 10px;text-align:center;">
          <div style="${emailStyles.eyebrow}">Order confirmed</div>
          <h1 style="${emailStyles.heading}">Thanks for shopping with us.</h1>
          <p style="margin:10px 0 0;${emailStyles.copy}">
            Your order is locked in and we are preparing it now.
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
                <div style="${emailStyles.label}">Placed</div>
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
            <tr>
              <td colspan="2" style="padding:4px 0 12px;">
                <div style="${emailStyles.labelAccent}">Receipt</div>
              </td>
            </tr>
            ${itemsHtml}
            <tr>
              <td style="padding:12px 0 4px;font-size:13px;color:${EMAIL_COLORS.muted};">Subtotal</td>
              <td align="right" style="padding:12px 0 4px;font-size:13px;color:${EMAIL_COLORS.text};">
                $${formatMoney(input.subtotal)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 4px;font-size:13px;color:${EMAIL_COLORS.muted};">Shipping</td>
              <td align="right" style="padding:0 0 4px;font-size:13px;color:${EMAIL_COLORS.text};">
                $${formatMoney(input.shipping)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 12px;font-size:14px;color:#ffffff;font-weight:700;border-bottom:1px solid ${EMAIL_COLORS.panelBorder};">
                Total
              </td>
              <td align="right" style="padding:0 0 12px;font-size:16px;color:#ffffff;font-weight:700;border-bottom:1px solid ${EMAIL_COLORS.panelBorder};">
                $${formatMoney(input.total)}
              </td>
            </tr>
            ${shippingBlock}
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
          If you have any questions, reply to this email and our team will help you out.
        </td>
      </tr>
    `;

  return renderEmailLayout({
    title: "Order Confirmation",
    preheader: `Order #${orderShort} confirmed.`,
    contentHtml,
  });
};

const buildEmailText = (input: OrderConfirmationEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderDate = new Date(input.createdAt).toLocaleDateString("en-US");
  const addressLines = buildAddressLines(input.shippingAddress);

  const lines = [
    "Realdealkickzsc",
    `Order #${orderShort}`,
    `Placed: ${orderDate}`,
    "Receipt",
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
  lines.push(emailFooterText());

  return lines.join("\n");
};

// Tracking Panel Builder
const buildTrackingPanelHtml = (input: OrderTrackingEmailBase) => {
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

const buildTrackingPanelText = (input: OrderTrackingEmailBase) => {
  const lines: string[] = [];
  if (input.carrier) lines.push(`Carrier: ${input.carrier}`);
  if (input.trackingNumber) lines.push(`Tracking: ${input.trackingNumber}`);
  if (input.trackingUrl) lines.push(`Track: ${input.trackingUrl}`);
  return lines.join("\n");
};

// Label Created
const buildLabelCreatedEmailHtml = (input: OrderLabelCreatedEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/account`;
  const buttonUrl = input.trackingUrl ?? orderUrl;
  const buttonLabel = input.trackingUrl ? "Track your package" : "View your order";
  const trackingNumber = input.trackingNumber ? ` (${input.trackingNumber})` : '';

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

  return renderEmailLayout({
    title: "Label Created",
    preheader: `Shipping label created for order #${orderShort}.`,
    contentHtml,
  });
};

const buildLabelCreatedEmailText = (input: OrderLabelCreatedEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const lines = [
    "Realdealkickzsc",
    `Order #${orderShort}`,
    "Your shipping label has been created.",
    "Tracking may take a bit to update until the carrier scans the package.",
    buildTrackingPanelText(input),
    "",
    `View your order: ${env.NEXT_PUBLIC_SITE_URL}/account`,
    emailFooterText(),
  ].filter(Boolean);

  return lines.join("\n");
};

// In Transit
const buildInTransitEmailHtml = (input: OrderInTransitEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/account`;
  const buttonUrl = input.trackingUrl ?? orderUrl;
  const buttonLabel = input.trackingUrl ? "Track your package" : "View your order";

  const contentHtml = `
    <tr>
      <td style="padding:0 24px 10px;text-align:center;">
        <div style="${emailStyles.eyebrow}">On the way</div>
        <h1 style="${emailStyles.heading}">Your order is in transit.</h1>
        <p style="margin:10px 0 0;${emailStyles.copy}">
          Your package is moving through the carrier network.
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

  return renderEmailLayout({
    title: "Order In Transit",
    preheader: `Order #${orderShort} is on the way.`,
    contentHtml,
  });
};

const buildInTransitEmailText = (input: OrderInTransitEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const lines = [
    "Realdealkickzsc",
    `Order #${orderShort}`,
    "Your order is in transit.",
    buildTrackingPanelText(input),
    "",
    `View your order: ${env.NEXT_PUBLIC_SITE_URL}/account`,
    emailFooterText(),
  ].filter(Boolean);

  return lines.join("\n");
};

// Delivered
const buildDeliveredEmailHtml = (input: OrderDeliveredEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/account`;
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

  return renderEmailLayout({
    title: "Order Delivered",
    preheader: `Order #${orderShort} was delivered.`,
    contentHtml,
  });
};

const buildDeliveredEmailText = (input: OrderDeliveredEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const lines = [
    "Realdealkickzsc",
    `Order #${orderShort}`,
    "Your order was delivered.",
    buildTrackingPanelText(input),
    "",
    `View your order: ${env.NEXT_PUBLIC_SITE_URL}/account`,
    emailFooterText(),
  ].filter(Boolean);

  return lines.join("\n");
};

// Refunded
const buildRefundedEmailHtml = (input: OrderRefundedEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/account`;

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

  return renderEmailLayout({
    title: "Refund Processed",
    preheader: `Refund processed for order #${orderShort}.`,
    contentHtml,
  });
};

const buildRefundedEmailText = (input: OrderRefundedEmailInput) => {
  const orderShort = input.orderId.slice(0, 8).toUpperCase();
  const lines = [
    "Realdealkickzsc",
    `Order #${orderShort}`,
    `Refund amount: $${formatMoney(input.refundAmount / 100)}`,
    "Your refund has been processed.",
    "The refund should appear in your account within 5-10 business days.",
    "",
    `View your order: ${env.NEXT_PUBLIC_SITE_URL}/account`,
    emailFooterText(),
  ];

  return lines.join("\n");
};

export class OrderEmailService {
  async sendOrderConfirmation(input: OrderConfirmationEmailInput) {
    if (!input.to) return;
    await sendEmail({
      to: input.to,
      subject: "Your Realdealkickzsc order is confirmed",
      html: buildEmailHtml(input),
      text: buildEmailText(input),
    });
  }

  async sendOrderLabelCreated(input: OrderLabelCreatedEmailInput) {
    if (!input.to) return;
    await sendEmail({
      to: input.to,
      subject: `Your Realdealkickzsc order #${input.orderId.slice(0, 8)} label is created`,
      html: buildLabelCreatedEmailHtml(input),
      text: buildLabelCreatedEmailText(input),
    });
  }

  async sendOrderInTransit(input: OrderInTransitEmailInput) {
    if (!input.to) return;
    await sendEmail({
      to: input.to,
      subject: `Your Realdealkickzsc order #${input.orderId.slice(0, 8)} is on the way`,
      html: buildInTransitEmailHtml(input),
      text: buildInTransitEmailText(input),
    });
  }

  async sendOrderDelivered(input: OrderDeliveredEmailInput) {
    if (!input.to) return;
    await sendEmail({
      to: input.to,
      subject: `Your Realdealkickzsc order #${input.orderId.slice(0, 8)} was delivered`,
      html: buildDeliveredEmailHtml(input),
      text: buildDeliveredEmailText(input),
    });
  }

  async sendOrderRefunded(input: OrderRefundedEmailInput) {
    if (!input.to) return;
    await sendEmail({
      to: input.to,
      subject: `Your Realdealkickzsc order #${input.orderId.slice(0, 8)} has been refunded`,
      html: buildRefundedEmailHtml(input),
      text: buildRefundedEmailText(input),
    });
  }
}