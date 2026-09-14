import { logger } from '../logger.js';
import type { NotificationChannelImpl, OutboundMessage, SendResult } from './channel.types.js';

/**
 * Default channel for dev + tests: logs the email instead of sending it, so the
 * whole notification flow works with zero SMTP config. Always succeeds.
 */
export const consoleChannel: NotificationChannelImpl = {
  channel: 'EMAIL',
  name: 'console',
  async send(msg: OutboundMessage): Promise<SendResult> {
    logger.info({ to: msg.to, subject: msg.subject }, `📧 [console] ${msg.subject}`);
    return { ok: true };
  },
};
