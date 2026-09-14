import { env } from '../env.js';
import { logger } from '../logger.js';
import type { NotificationChannelImpl, OutboundMessage, SendResult } from './channel.types.js';

type Channel = NotificationChannelImpl['channel'];

/** Generic console transport for any channel — used when a channel has no
 *  credentials configured, so every channel works in dev/tests by logging. */
export function makeConsoleChannel(channel: Channel): NotificationChannelImpl {
  return {
    channel,
    name: `${channel.toLowerCase()}:console`,
    async send(msg: OutboundMessage): Promise<SendResult> {
      logger.info({ channel, to: msg.to }, `📨 [${channel} console] ${msg.body.slice(0, 80)}`);
      return { ok: true };
    },
  };
}

async function twilioSend(to: string, from: string, body: string): Promise<SendResult> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `twilio_${res.status}:${detail.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** SMS via Twilio (falls back to console when unconfigured). */
export function smsChannel(): NotificationChannelImpl {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_SMS_FROM) return makeConsoleChannel('SMS');
  return {
    channel: 'SMS',
    name: 'sms:twilio',
    send: (msg) => twilioSend(msg.to, env.TWILIO_SMS_FROM, msg.body),
  };
}

/** WhatsApp via Twilio (falls back to console when unconfigured). */
export function whatsappChannel(): NotificationChannelImpl {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_WHATSAPP_FROM) return makeConsoleChannel('WHATSAPP');
  return {
    channel: 'WHATSAPP',
    name: 'whatsapp:twilio',
    send: (msg) => {
      const to = msg.to.startsWith('whatsapp:') ? msg.to : `whatsapp:${msg.to}`;
      return twilioSend(to, env.TWILIO_WHATSAPP_FROM, msg.body);
    },
  };
}

/** Telegram via the Bot API (falls back to console when unconfigured). */
export function telegramChannel(): NotificationChannelImpl {
  if (!env.TELEGRAM_BOT_TOKEN) return makeConsoleChannel('TELEGRAM');
  return {
    channel: 'TELEGRAM',
    name: 'telegram:bot',
    async send(msg): Promise<SendResult> {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: msg.to, text: msg.body }),
          },
        );
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          return { ok: false, error: `telegram_${res.status}:${detail.slice(0, 120)}` };
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    },
  };
}
