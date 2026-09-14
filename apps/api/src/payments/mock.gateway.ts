import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentStatus } from '@hafalati/shared';
import { env } from '../env.js';
import type {
  InitPaymentInput,
  InitPaymentResult,
  PaymentGateway,
  VerifyResult,
  WebhookRequest,
  WebhookResult,
} from './gateway.types.js';

/**
 * In-memory mock gateway for local dev + tests. No external calls, no
 * credentials. The customer is sent to an in-app checkout page
 * (`/payment/mock/:ref`) that calls a dev-only endpoint to simulate the
 * gateway's async webhook. Webhooks are HMAC-signed with the webhook secret so
 * the signature-verification path is exercised exactly like a real provider.
 */
const store = new Map<string, { status: PaymentStatus; amount: number }>();

const SECRET = env.KONNECT_WEBHOOK_SECRET || 'mock-webhook-secret';

export function signMockPayload(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}

export const mockGateway: PaymentGateway = {
  name: 'mock',

  async initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
    const providerRef = `mock_${input.paymentId}`;
    store.set(providerRef, { status: 'PENDING', amount: input.amount });
    // Send the customer to the in-app mock checkout page.
    const checkoutUrl = `${env.PUBLIC_WEB_URL}/payment/mock/${providerRef}?amount=${input.amount}`;
    return { providerRef, checkoutUrl };
  },

  async verify(providerRef: string): Promise<VerifyResult> {
    const rec = store.get(providerRef);
    return { status: rec?.status ?? 'PENDING', amount: rec?.amount ?? 0 };
  },

  async parseWebhook(req: WebhookRequest): Promise<WebhookResult> {
    const body = (req.body ?? {}) as { providerRef?: string; status?: PaymentStatus };
    const providerRef = body.providerRef;
    const status = body.status;
    if (!providerRef || !status) {
      throw new Error('invalid_webhook_payload');
    }

    const signature = String(req.headers['x-mock-signature'] ?? '');
    const expected = signMockPayload(`${providerRef}:${status}`);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new Error('invalid_signature');
    }

    const rec = store.get(providerRef);
    if (rec) rec.status = status;
    return { providerRef, status };
  },
};

/** Test/dev helper: flip a mock payment's stored status (used by the dev endpoint). */
export function setMockStatus(providerRef: string, status: PaymentStatus) {
  const rec = store.get(providerRef);
  if (rec) rec.status = status;
  else store.set(providerRef, { status, amount: 0 });
}
