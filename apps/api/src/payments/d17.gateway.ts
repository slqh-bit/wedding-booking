import type { PaymentStatus } from '@hafalati/shared';
import { toMillimes } from '@hafalati/shared';
import { env } from '../env.js';
import { logger } from '../logger.js';
import type {
  InitPaymentInput,
  InitPaymentResult,
  PaymentGateway,
  VerifyResult,
  WebhookRequest,
  WebhookResult,
} from './gateway.types.js';

/**
 * D17 gateway (La Poste Tunisienne e-wallet).
 *
 * D17's merchant API is not openly documented, so this adapter targets a
 * generic init/verify REST contract driven by D17_BASE_URL + D17_API_KEY +
 * D17_MERCHANT_ID. The endpoint paths and response field names below are
 * best-effort placeholders and MUST be confirmed against D17's official
 * merchant documentation before enabling `PAYMENT_PROVIDER=d17` in production.
 * The shape (hosted checkout + verify-on-return) matches Konnect/Flouci so no
 * call site changes when the exact fields are finalized.
 */
function mapStatus(s: string): PaymentStatus {
  const v = s.toUpperCase();
  if (v === 'PAID' || v === 'SUCCESS' || v === 'COMPLETED') return 'CONFIRMED';
  if (v === 'PENDING' || v === 'CREATED' || v === 'PROCESSING') return 'PENDING';
  return 'FAILED';
}

function authHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${env.D17_API_KEY}` };
}

export const d17Gateway: PaymentGateway = {
  name: 'd17',

  async initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
    const res = await fetch(`${env.D17_BASE_URL}/payments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        merchantId: env.D17_MERCHANT_ID,
        amount: toMillimes(input.amount),
        currency: 'TND',
        orderId: input.reference,
        description: input.description,
        returnUrl: input.returnUrl,
        webhookUrl: input.webhookUrl,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      paymentId?: string;
      checkoutUrl?: string;
      redirectUrl?: string;
    };
    const providerRef = data.paymentId ?? data.id;
    const checkoutUrl = data.checkoutUrl ?? data.redirectUrl;
    if (!res.ok || !providerRef || !checkoutUrl) {
      logger.error({ status: res.status, data }, 'D17 init failed');
      throw new Error('d17_init_failed');
    }
    return { providerRef, checkoutUrl };
  },

  async verify(providerRef: string): Promise<VerifyResult> {
    const res = await fetch(`${env.D17_BASE_URL}/payments/${providerRef}`, {
      headers: authHeaders(),
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string; amount?: number };
    return { status: mapStatus(data.status ?? 'pending'), amount: (data.amount ?? 0) / 1000 };
  },

  async parseWebhook(req: WebhookRequest): Promise<WebhookResult> {
    const body = (req.body ?? {}) as { paymentId?: string; id?: string };
    const providerRef = String(req.query.paymentId ?? body.paymentId ?? body.id ?? '');
    if (!providerRef) throw new Error('missing_payment_id');
    const { status } = await this.verify(providerRef);
    return { providerRef, status };
  },
};
