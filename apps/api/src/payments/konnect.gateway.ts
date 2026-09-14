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
 * Konnect (https://konnect.network) gateway — Tunisian hosted checkout.
 *
 * Flow: init-payment → redirect to `payUrl` → Konnect calls our webhook URL
 * with `?payment_ref=…`. Konnect does not sign webhooks; the documented,
 * secure pattern is to treat the webhook as a *notification* and re-fetch the
 * authoritative status from `GET /payments/:ref`. So `parseWebhook` verifies by
 * calling `verify`, which is the source of truth.
 */
function mapStatus(konnectStatus: string): PaymentStatus {
  const s = konnectStatus.toLowerCase();
  if (s === 'completed') return 'CONFIRMED';
  if (s === 'pending' || s === 'onhold' || s === 'processing') return 'PENDING';
  return 'FAILED'; // failed, expired, canceled, declined, …
}

async function konnectFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${env.KONNECT_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.KONNECT_API_KEY,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.error({ path, status: res.status, data }, 'Konnect API error');
    throw new Error(`konnect_error_${res.status}`);
  }
  return data;
}

export const konnectGateway: PaymentGateway = {
  name: 'konnect',

  async initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
    const [firstName, ...rest] = input.customer.fullName.split(' ');
    const data = (await konnectFetch('/payments/init-payment', {
      method: 'POST',
      body: JSON.stringify({
        receiverWalletId: env.KONNECT_WALLET_ID,
        token: 'TND',
        amount: toMillimes(input.amount), // Konnect expects millimes
        type: 'immediate',
        description: input.description,
        acceptedPaymentMethods: ['bank_card', 'e-DINAR', 'wallet'],
        lifespan: 30, // minutes
        checkoutForm: false,
        firstName: firstName || 'Client',
        lastName: rest.join(' ') || '-',
        email: input.customer.email,
        phoneNumber: input.customer.phone.replace('+216', ''),
        orderId: input.reference,
        webhook: input.webhookUrl,
        successUrl: `${input.returnUrl}&result=success`,
        failUrl: `${input.returnUrl}&result=fail`,
        silentWebhook: true,
      }),
    })) as { payUrl?: string; paymentRef?: string };

    if (!data.payUrl || !data.paymentRef) {
      throw new Error('konnect_init_missing_fields');
    }
    return { providerRef: data.paymentRef, checkoutUrl: data.payUrl };
  },

  async verify(providerRef: string): Promise<VerifyResult> {
    const data = (await konnectFetch(`/payments/${providerRef}`)) as {
      payment?: { status?: string; amount?: number };
    };
    const payment = data.payment ?? {};
    return {
      status: mapStatus(payment.status ?? 'pending'),
      amount: (payment.amount ?? 0) / 1000, // millimes → TND
    };
  },

  async parseWebhook(req: WebhookRequest): Promise<WebhookResult> {
    const providerRef = String(
      req.query.payment_ref ?? (req.body as { payment_ref?: string })?.payment_ref ?? '',
    );
    if (!providerRef) throw new Error('missing_payment_ref');
    // Authoritative: re-fetch status from Konnect.
    const { status } = await this.verify(providerRef);
    return { providerRef, status };
  },
};
