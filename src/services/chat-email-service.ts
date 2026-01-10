// src/services/chat-email-service.ts
import { sendEmail } from "@/lib/email/mailer";
import { emailSubjects } from "@/config/constants/email";
import {
  buildChatNotificationEmail,
  type ChatEmailInput,
} from "@/lib/email/chat/notification";

export class ChatEmailService {
  async sendChatNotification(input: ChatEmailInput) {
    if (!input.to) return;
    const content = buildChatNotificationEmail(input);

    await sendEmail({
      to: input.to,
      subject: emailSubjects.chatNotification(),
      html: content.html,
      text: content.text,
    });
  }
}
