// src/services/admin-order-email-service.ts
import { sendEmail } from "@/lib/email/mailer";
import { emailSubjects } from "@/config/constants/email";
import { buildAdminOrderPlacedEmail } from "@/lib/email/orders/admin-order-placed";
import type { AdminOrderPlacedEmailInput } from "@/types/domain/email";

export class AdminOrderEmailService {
  async sendOrderPlaced(input: AdminOrderPlacedEmailInput) {
    if (!input.to) return;
    const content = buildAdminOrderPlacedEmail(input);

    await sendEmail({
      to: input.to,
      subject: emailSubjects.adminOrderPlaced(input.orderId),
      html: content.html,
      text: content.text,
    });
  }
}
