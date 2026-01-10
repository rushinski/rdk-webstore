// src/services/order-email-service.ts
import { env } from "@/config/env";
import { emailSubjects } from "@/config/constants/email";
import { sendEmailWithRetry } from "@/lib/email/mailer";
import {
  buildOrderConfirmationEmail,
  buildOrderDeliveredEmail,
  buildOrderInTransitEmail,
  buildOrderLabelCreatedEmail,
  buildOrderRefundedEmail,
  buildPickupInstructionsEmail,
  type OrderConfirmationEmailInput,
  type OrderDeliveredEmailInput,
  type OrderInTransitEmailInput,
  type OrderLabelCreatedEmailInput,
  type OrderRefundedEmailInput,
  type PickupInstructionsEmailInput,
} from "@/lib/email/orders";

type EmailContent = { html: string; text: string };

export class OrderEmailService {
  private async send(to: string, subject: string, content: EmailContent) {
    await sendEmailWithRetry(
      {
        to,
        subject,
        html: content.html,
        text: content.text,
        replyTo: env.SUPPORT_INBOX_EMAIL,
      },
      { maxAttempts: 3, baseDelayMs: 750, timeoutMs: 5000 }
    );
  }

  async sendOrderConfirmation(input: OrderConfirmationEmailInput) {
    if (!input.to) return;
    const content = buildOrderConfirmationEmail(input);
    await this.send(input.to, emailSubjects.orderConfirmation(), content);
  }

  async sendPickupInstructions(input: PickupInstructionsEmailInput) {
    if (!input.to) return;
    const content = buildPickupInstructionsEmail(input);
    await this.send(input.to, emailSubjects.pickupInstructions(input.orderId), content);
  }

  async sendOrderLabelCreated(input: OrderLabelCreatedEmailInput) {
    if (!input.to) return;
    const content = buildOrderLabelCreatedEmail(input);
    await this.send(input.to, emailSubjects.orderLabelCreated(input.orderId), content);
  }

  async sendOrderInTransit(input: OrderInTransitEmailInput) {
    if (!input.to) return;
    const content = buildOrderInTransitEmail(input);
    await this.send(input.to, emailSubjects.orderInTransit(input.orderId), content);
  }

  async sendOrderDelivered(input: OrderDeliveredEmailInput) {
    if (!input.to) return;
    const content = buildOrderDeliveredEmail(input);
    await this.send(input.to, emailSubjects.orderDelivered(input.orderId), content);
  }

  async sendOrderRefunded(input: OrderRefundedEmailInput) {
    if (!input.to) return;
    const content = buildOrderRefundedEmail(input);
    await this.send(input.to, emailSubjects.orderRefunded(input.orderId), content);
  }
}
