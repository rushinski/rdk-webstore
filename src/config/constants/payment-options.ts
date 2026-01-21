// src/config/constants/payment-options.ts
export const PAYMENT_METHOD_TYPES = [
  {
    key: "card",
    label: "Card",
    description: "Credit/debit cards, Apple Pay, and Google Pay.",
  },
  {
    key: "link",
    label: "Link",
    description: "Stripe Link one-click checkout.",
  },
  {
    key: "affirm",
    label: "Affirm",
    description: "Pay over time with Affirm.",
  },
  {
    key: "afterpay_clearpay",
    label: "Afterpay / Clearpay",
    description: "Pay in installments with Afterpay/Clearpay.",
  },
  {
    key: "klarna",
    label: "Klarna",
    description: "Pay in installments with Klarna.",
  },
  {
    key: "us_bank_account",
    label: "US bank account",
    description: "Pay via ACH bank transfer.",
  },
  {
    key: "cashapp",
    label: "Cash App Pay",
    description: "Pay with Cash App Pay.",
  },
  {
    key: "paypal",
    label: "PayPal",
    description: "Pay with PayPal.",
  },
  {
    key: "amazon_pay",
    label: "Amazon Pay",
    description: "Pay with Amazon Pay.",
  },
] as const;

export const EXPRESS_CHECKOUT_METHODS = [
  { key: "apple_pay", label: "Apple Pay" },
  { key: "google_pay", label: "Google Pay" },
  { key: "link", label: "Link" },
  { key: "paypal", label: "PayPal" },
  { key: "amazon_pay", label: "Amazon Pay" },
  { key: "klarna", label: "Klarna" },
] as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number]["key"];
export type ExpressCheckoutMethod = (typeof EXPRESS_CHECKOUT_METHODS)[number]["key"];

export const DEFAULT_EXPRESS_CHECKOUT_METHODS: ExpressCheckoutMethod[] = [
  "apple_pay",
  "google_pay",
  "link",
  "paypal",
  "amazon_pay",
  "klarna",
];
