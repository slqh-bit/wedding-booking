import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../env.js';
import { logger } from '../logger.js';
import type { NotificationChannelImpl, OutboundMessage, SendResult } from './channel.types.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

/** Real email delivery over SMTP (nodemailer). Enabled by NOTIFY_PROVIDER=smtp. */
export const smtpChannel: NotificationChannelImpl = {
  channel: 'EMAIL',
  name: 'smtp',
  async send(msg: OutboundMessage): Promise<SendResult> {
    try {
      await getTransporter().sendMail({
        from: env.NOTIFY_FROM,
        to: msg.to,
        subject: msg.subject,
        text: msg.body,
      });
      return { ok: true };
    } catch (err) {
      logger.error({ err, to: msg.to }, 'SMTP send failed');
      return { ok: false, error: (err as Error).message };
    }
  },
};
