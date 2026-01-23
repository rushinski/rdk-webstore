import { env } from "@/config/env";
import { BRAND_NAME } from "@/config/constants/brand";
import { renderEmailLayout } from "@/lib/email/template";
import { emailFooterText } from "@/lib/email/footer";
import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";

export type ChatEmailInput = {
  to: string;
  chatId: string;
  orderId?: string | null;
  senderRole: "customer" | "admin";
  senderLabel?: string | null;
  message: string;
  recipientRole: "admin" | "customer";
};

const buildChatLink = (input: ChatEmailInput) => {
  if (input.recipientRole === "admin") {
    return `${env.NEXT_PUBLIC_SITE_URL}/admin/chats?chatId=${input.chatId}`;
  }

  return `${env.NEXT_PUBLIC_SITE_URL}/?chat=1`;
};

const truncate = (value: string, max = 240) => {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 3)}...`;
};

export const buildChatNotificationEmail = (input: ChatEmailInput) => {
  const orderShort = input.orderId ? input.orderId.slice(0, 8).toUpperCase() : null;
  const chatUrl = buildChatLink(input);
  const baseSender = input.senderRole === "admin" ? "Admin" : "Customer";
  const senderLabel = input.senderLabel
    ? `${baseSender} (${input.senderLabel})`
    : baseSender;

  const contentHtml = `
    <tr>
      <td style="padding:0 24px 10px;text-align:center;">
        <div style="${emailStyles.eyebrow}">New message</div>
        <h1 style="${emailStyles.heading}">You have a new message</h1>
        <p style="margin:10px 0 0;${emailStyles.copy}">
          ${senderLabel} sent a new chat message${orderShort ? ` for order #${orderShort}` : ""}.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${emailStyles.panel}">
          <tr>
            <td style="padding:16px;font-size:14px;color:${EMAIL_COLORS.text};line-height:1.6;">
              ${truncate(input.message)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px;text-align:center;">
        <a href="${chatUrl}" style="${emailStyles.button}">Open chat</a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px;font-size:11px;line-height:1.6;color:${EMAIL_COLORS.subtle};">
        You can manage chat notification preferences in your account settings.
      </td>
    </tr>
  `;

  const html = renderEmailLayout({
    title: "New message",
    preheader: truncate(input.message, 70),
    contentHtml,
  });

  const lines = [
    BRAND_NAME,
    `New message from ${senderLabel}${orderShort ? ` (Order #${orderShort})` : ""}`,
    "",
    truncate(input.message),
    "",
    `Open chat: ${chatUrl}`,
    "",
    emailFooterText(),
  ];

  return { html, text: lines.join("\n") };
};
