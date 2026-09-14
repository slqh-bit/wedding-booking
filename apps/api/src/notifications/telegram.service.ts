import { randomBytes } from 'node:crypto';
import { isLocale, type Locale } from '@hafalati/shared';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { AppError } from '../http/errors.js';
import { telegramChannel } from './messaging.channels.js';

/** Whether a real bot is configured (disables the dev mock-link endpoint). */
export function isTelegramConfigured(): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME);
}

const LINK_CONFIRM: Record<Locale, string> = {
  ar: '✅ تم ربط حساب تيليجرام بنجاح! ستصلك إشعارات حفلاتي هنا.',
  fr: '✅ Votre compte Telegram est lié ! Vous recevrez les notifications Hafalati ici.',
  en: '✅ Your Telegram is linked! You’ll get Hafalati notifications here.',
};

/** Start linking: issue a one-time code + the bot deep link for this user. */
export async function startTelegramLink(userId: string) {
  const code = randomBytes(8).toString('hex');
  await prisma.user.update({ where: { id: userId }, data: { telegramLinkCode: code } });

  const botConfigured = isTelegramConfigured();
  const deepLink = env.TELEGRAM_BOT_USERNAME
    ? `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${code}`
    : null;
  return { code, deepLink, botConfigured };
}

export async function telegramStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true },
  });
  return { linked: Boolean(user?.telegramChatId) };
}

export async function unlinkTelegram(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { telegramChatId: null } });
  return { linked: false };
}

/**
 * Complete linking from a `/start <code>` interaction: find the user by code,
 * store their chat id, clear the code, and send a confirmation to the chat.
 * Returns whether a user was linked.
 */
export async function completeTelegramLink(code: string, chatId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { telegramLinkCode: code } });
  if (!user) return false;

  await prisma.user.update({
    where: { id: user.id },
    data: { telegramChatId: chatId, telegramLinkCode: null },
  });

  const locale: Locale = isLocale(user.locale) ? user.locale : 'ar';
  // Best-effort confirmation message (console channel in dev).
  await telegramChannel()
    .send({ to: chatId, subject: 'Hafalati', body: LINK_CONFIRM[locale] })
    .catch(() => undefined);

  return true;
}

/** Parse a Telegram webhook update and, if it's a `/start <code>`, link it. */
export async function handleTelegramUpdate(update: unknown): Promise<{ linked: boolean }> {
  const message = (update as { message?: { text?: string; chat?: { id?: number | string } } })
    ?.message;
  const text = message?.text?.trim() ?? '';
  const chatId = message?.chat?.id;
  const match = /^\/start\s+(\S+)/.exec(text);
  const code = match?.[1];
  if (!code || chatId === undefined) return { linked: false };

  const linked = await completeTelegramLink(code, String(chatId));
  logger.info({ chatId, linked }, 'Telegram /start processed');
  return { linked };
}

/** Verify the webhook secret path segment (constant-ish; empty secret = allow in dev). */
export function verifyWebhookSecret(secret: string): void {
  if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    throw AppError.unauthorized('bad_webhook_secret', 'Invalid webhook secret');
  }
}
