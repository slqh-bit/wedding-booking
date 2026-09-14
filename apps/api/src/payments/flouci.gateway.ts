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
 * Flouci gateway (https://developers.flouci.com) — Tunisian hosted checkout.
 *
 * init → `generate_payment` returns a `link` + `payment_id`; the customer is
 * redirected to `success_link`/`fail_link` with `payment_id` in the query.
 * Flouci does not sign redirects, so `parseWebhook` verifies by re-fetching the
 * authoritative status from `verify_payment` (same pattern as Konnect).
 */
function mapStatus(s: string): PaymentStatus {
  const v = s.toUpperCase();
  if (v === 'SUCCESS') return 'CONFIRMED';
  if (v === 'PENDING' || v === 'CREATED') return 'PENDING';
  return 'FAILED'; // FAILURE, EXPIRED, CANCELED, …
}

export const flouciGateway: PaymentGateway = {
  name: 'flouci',

  async initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
    const res = await fetch(`${env.FLOUCI_BASE_URL}/api/v2/generate_payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_token: env.FLOUCI_APP_TOKEN,
        app_secret: env.FLOUCI_APP_SECRET,
        amount: String(toMillimes(input.amount)), // millimes
        accept_card: true,
        session_timeout_secs: 1800,
        success_link: `${input.returnUrl}&result=success`,
        fail_link: `${input.returnUrl}&result=fail`,
        developer_tracking_id: input.reference,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      result?: { link?: string; payment_id?: string };
    };
    if (!res.ok || !data.result?.link || !data.result.payment_id) {
      logger.error({ status: res.status, data }, 'Flouci init failed');
      throw new Error('flouci_init_failed');
    }
    return { providerRef: data.result.payment_id, checkoutUrl: data.result.link };
  },

  async verify(providerRef: string): Promise<VerifyResult> {
    const res = await fetch(`${env.FLOUCI_BASE_URL}/api/v2/verify_payment/${providerRef}`, {
      headers: { apppublic: env.FLOUCI_APP_TOKEN, appsecret: env.FLOUCI_APP_SECRET },
    });
    const data = (await res.json().catch(() => ({}))) as {
      result?: { status?: string; amount?: number };
    };
    return {
      status: mapStatus(data.result?.status ?? 'pending'),
      amount: (data.result?.amount ?? 0) / 1000,
    };
  },

  async parseWebhook(req: WebhookRequest): Promise<WebhookResult> {
    const providerRef = String(
      req.query.payment_id ?? (req.body as { payment_id?: string })?.payment_id ?? '',
    );
    if (!providerRef) throw new Error('missing_payment_id');
    const { status } = await this.verify(providerRef);
    return { providerRef, status };
  },
};
