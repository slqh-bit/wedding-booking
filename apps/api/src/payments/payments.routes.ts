import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, AppError } from '../http/errors.js';
import { param } from '../http/params.js';
import { validateBody } from '../http/validate.js';
import { requireAuth } from '../auth/middleware.js';
import { logger } from '../logger.js';
import { getGateway, isMockProvider } from './gateway.factory.js';
import { setMockStatus, signMockPayload } from './mock.gateway.js';
import { applyWebhookResult, getPaymentStatus } from './payment.service.js';

export const paymentsRouter: Router = Router();

/**
 * Gateway webhook (public). Verified inside the gateway's parseWebhook
 * (signature for mock, authoritative re-fetch for Konnect). Always 200 on a
 * valid parse so the gateway doesn't retry a processed event; 400 on bad
 * signature / payload.
 */
paymentsRouter.all(
  '/webhook/:provider',
  asyncHandler(async (req, res) => {
    const gateway = getGateway();
    let parsed;
    try {
      parsed = await gateway.parseWebhook({
        headers: req.headers,
        query: req.query as Record<string, unknown>,
        body: req.body,
      });
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Rejected payment webhook');
      throw AppError.badRequest('invalid_webhook', 'Webhook rejected');
    }
    const outcome = await applyWebhookResult(parsed);
    res.json({ ok: true, outcome });
  }),
);

/** Poll payment status for the return page (owner-scoped). */
paymentsRouter.get(
  '/:id/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getPaymentStatus(req.user!.id, param(req, 'id')));
  }),
);

/**
 * Dev-only: simulate the gateway callback for the in-app mock checkout page.
 * Guarded by PAYMENT_PROVIDER=mock so it never exists in production.
 */
paymentsRouter.post(
  '/mock/:ref/complete',
  validateBody(z.object({ status: z.enum(['CONFIRMED', 'FAILED']).default('CONFIRMED') })),
  asyncHandler(async (req, res) => {
    if (!isMockProvider()) throw AppError.notFound();
    const providerRef = param(req, 'ref');
    const status = req.body.status as 'CONFIRMED' | 'FAILED';
    setMockStatus(providerRef, status);

    // Re-enter the exact webhook path (signed) so signature verification runs.
    const gateway = getGateway();
    const parsed = await gateway.parseWebhook({
      headers: { 'x-mock-signature': signMockPayload(`${providerRef}:${status}`) },
      query: {},
      body: { providerRef, status },
    });
    const outcome = await applyWebhookResult(parsed);
    res.json({ ok: true, outcome });
  }),
);
