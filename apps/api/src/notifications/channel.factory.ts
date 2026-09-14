import { env } from '../env.js';
import type { NotificationChannelImpl } from './channel.types.js';
import { consoleChannel } from './console.channel.js';
import { smtpChannel } from './smtp.channel.js';
import { smsChannel, telegramChannel, whatsappChannel } from './messaging.channels.js';

type Channel = NotificationChannelImpl['channel'];

/** Resolve the active email channel from NOTIFY_PROVIDER. */
export function getEmailChannel(): NotificationChannelImpl {
  return env.NOTIFY_PROVIDER === 'smtp' ? smtpChannel : consoleChannel;
}

/**
 * The channels a customer notification fans out to, from NOTIFY_CHANNELS
 * (csv, e.g. "email,sms,whatsapp,telegram"). Read from process.env at call time
 * so it can be toggled per-run/in tests. Unknown names are ignored.
 */
export function getActiveChannels(): NotificationChannelImpl[] {
  const raw = process.env.NOTIFY_CHANNELS ?? env.NOTIFY_CHANNELS ?? 'email';
  const wanted = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  );
  const channels: NotificationChannelImpl[] = [];
  if (wanted.has('EMAIL')) channels.push(getEmailChannel());
  if (wanted.has('SMS')) channels.push(smsChannel());
  if (wanted.has('WHATSAPP')) channels.push(whatsappChannel());
  if (wanted.has('TELEGRAM')) channels.push(telegramChannel());
  return channels;
}

/**
 * The recipient address for a channel + user. Returns null when the user can't
 * be reached on that channel (e.g. Telegram not linked and no ops fallback),
 * in which case the channel is skipped for that notification.
 */
export function recipientFor(
  channel: Channel,
  user: { email: string; phone: string; telegramChatId: string | null },
): string | null {
  switch (channel) {
    case 'EMAIL':
      return user.email || null;
    case 'SMS':
    case 'WHATSAPP':
      return user.phone || null;
    case 'TELEGRAM':
      return user.telegramChatId || env.TELEGRAM_OPS_CHAT_ID || null;
    default:
      return null;
  }
}
