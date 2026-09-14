import type { PaymentStatus } from '@hafalati/shared';

export interface InitPaymentInput {
  bookingId: string;
  paymentId: string;
  /** Amount in TND. */
  amount: number;
  reference: string;
  description: string;
  customer: { fullName: string; email: string; phone: string };
  /** Where the gateway should send the customer back after checkout. */
  returnUrl: string;
  /** Where the gateway should POST asynchronous status updates. */
  webhookUrl: string;
}

export interface InitPaymentResult {
  /** The gateway's own payment id/reference. */
  providerRef: string;
  /** Hosted checkout URL to redirect the customer to. */
  checkoutUrl: string;
}

export interface VerifyResult {
  status: PaymentStatus;
  /** Amount in TND as reported by the gateway (for cross-check). */
  amount: number;
}

export interface WebhookResult {
  providerRef: string;
  status: PaymentStatus;
}

/** Minimal webhook request shape (decoupled from Express). */
export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  body: unknown;
  rawBody?: string;
}

export interface PaymentGateway {
  readonly name: string;
  initPayment(input: InitPaymentInput): Promise<InitPaymentResult>;
  verify(providerRef: string): Promise<VerifyResult>;
  /** Validate + parse a webhook. Throws on bad signature. */
  parseWebhook(req: WebhookRequest): Promise<WebhookResult>;
}
