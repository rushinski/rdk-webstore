import { BRAND_NAME } from "@/config/constants/brand";

const shortOrderId = (orderId: string) => orderId.slice(0, 8);

export const emailSubjects = {
  orderConfirmation: () => `Your ${BRAND_NAME} order is confirmed`,
  pickupInstructions: (orderId: string) =>
    `Local pickup instructions for order #${shortOrderId(orderId)}`,
  orderLabelCreated: (orderId: string) =>
    `Your ${BRAND_NAME} order #${shortOrderId(orderId)} label is created`,
  orderInTransit: (orderId: string) =>
    `Your ${BRAND_NAME} order #${shortOrderId(orderId)} is on the way`,
  orderDelivered: (orderId: string) =>
    `Your ${BRAND_NAME} order #${shortOrderId(orderId)} was delivered`,
  orderRefunded: (orderId: string) =>
    `Your ${BRAND_NAME} order #${shortOrderId(orderId)} has been refunded`,
  subscriptionConfirmed: () => `Thanks for subscribing to ${BRAND_NAME}`,
  subscriptionConfirmation: () => `Confirm your ${BRAND_NAME} subscription`,
  passwordUpdated: () => `Your ${BRAND_NAME} password was updated`,
  chatNotification: () => `New chat message from ${BRAND_NAME}`,
};
