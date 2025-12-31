import { env } from "@/config/env";
import { sendEmail } from "@/lib/email/mailer";
import { emailFooterText } from "@/lib/email/footer";
import { renderEmailLayout } from "@/lib/email/template";
import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";

export type ChatEmailInput = {
  to: string;
  chatId: string;
  orderId?: string | null;
  senderRole: "customer" | "admin";
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
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}...`;
};

const buildEmailHtml = (input: ChatEmailInput) => {
  const orderShort = input.orderId ? input.orderId.slice(0, 8).toUpperCase() : null;
  const chatUrl = buildChatLink(input);
  const senderLabel = input.senderRole === "admin" ? "Admin" : "Customer";

  const contentHtml = `
    <tr>
      <td style="padding:0 24px 10px;text-align:center;">
        <div style="${emailStyles.eyebrow}">New chat message</div>
        <h1 style="${emailStyles.heading}">You have a new message</h1>
        <p style="margin:10px 0 0;${emailStyles.copy}">
          ${senderLabel} sent a new chat update${orderShort ? ` for order #${orderShort}` : ""}.
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

  return renderEmailLayout({
    title: "New chat message",
    preheader: truncate(input.message, 70),
    contentHtml,
  });
};

const buildEmailText = (input: ChatEmailInput) => {
  const orderShort = input.orderId ? input.orderId.slice(0, 8).toUpperCase() : null;
  const senderLabel = input.senderRole === "admin" ? "Admin" : "Customer";
  const chatUrl = buildChatLink(input);

  const lines = [
    "Realdealkickzsc",
    `New chat message from ${senderLabel}${orderShort ? ` (Order #${orderShort})` : ""}`,
    "",
    truncate(input.message),
    "",
    `Open chat: ${chatUrl}`,
    "",
    emailFooterText(),
  ];

  return lines.join("\n");
};

export class ChatEmailService {
  async sendChatNotification(input: ChatEmailInput) {
    if (!input.to) return;

    await sendEmail({
      to: input.to,
      subject: "New chat message from Realdealkickzsc",
      html: buildEmailHtml(input),
      text: buildEmailText(input),
    });
  }
}
