// src/types/domain/payrilla.ts
// Type declarations for the PayRilla Hosted Tokenization browser SDK.

export interface CardFormResult {
  nonce: string;
  expiryMonth: number;
  expiryYear: number;
  avsZip: string;
  maskedCard: string;
  maskedCvv2: string;
  cardType: string;
  last4: string;
}

export interface HostedTokenizationOptions {
  target?: string | Element;
  showZip?: boolean;
  requireCvv2?: boolean;
  styles?: Record<string, string>;
  labelType?: "floating" | "static-top" | "static-left" | "hidden";
}

export interface HostedTokenizationInstance {
  getNonceToken(): Promise<CardFormResult>;
  getData(): Promise<{ error: unknown; result: Partial<CardFormResult> }>;
  resetForm(): HostedTokenizationInstance;
  destroy(): void;
  setStyles(styles: Record<string, string>): HostedTokenizationInstance;
  setOptions(options: HostedTokenizationOptions): HostedTokenizationInstance;
  on(
    event: "input" | "change" | "ready",
    handler: (event: { error?: unknown; result?: Partial<CardFormResult> }) => void,
  ): HostedTokenizationInstance;
}

declare global {
  interface Window {
    HostedTokenization: new (
      sourceKey: string,
      options?: HostedTokenizationOptions,
    ) => HostedTokenizationInstance;
  }
}
