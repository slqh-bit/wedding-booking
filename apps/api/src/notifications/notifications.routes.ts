import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, AppError } from '../http/errors.js';
import { param } from '../http/params.js';
import { validateBody } from '../http/validate.js';
import { requireAuth } from '../auth/middleware.js';
import {
  completeTelegramLink,
  handleTelegramUpdate,
  isTelegramConfigured,
  startTelegramLink,
  telegramStatus,
  unlinkTelegram,
  verifyWebhookSecret,
} from './telegram.service.js';

export const notificationsRouter: Router = Router();

// ── Telegram account linking (auth) ─────────────────────
notificationsRouter.post(
  '/telegram/link',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await startTelegramLink(req.user!.id));
  }),
);

notificationsRouter.get(
  '/telegram/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await telegramStatus(req.user!.id));
  }),
);

notificationsRouter.post(
  '/telegram/unlink',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await unlinkTelegram(req.user!.id));
  }),
);

// ── Telegram bot webhook (public, verified by secret path segment) ──
notificationsRouter.post(
  '/telegram/webhook/:secret',
  asyncHandler(async (req, res) => {
    verifyWebhookSecret(param(req, 'secret'));
    await handleTelegramUpdate(req.body);
    res.json({ ok: true });
  }),
);

/**
 * Dev-only: simulate the bot's `/start <code>` so the linking flow is demoable
 * without a real bot. Disabled once a real bot is configured.
 */
notificationsRouter.post(
  '/telegram/mock-link',
  validateBody(z.object({ code: z.string().min(4), chatId: z.string().default('999000999') })),
  asyncHandler(async (req, res) => {
    if (isTelegramConfigured()) throw AppError.notFound();
    const linked = await completeTelegramLink(req.body.code, req.body.chatId);
    res.json({ linked });
  }),
);
