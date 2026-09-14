import { env } from '../env.js';
import type { NotificationChannelImpl } from './channel.types.js';
import { consoleChannel } from './console.channel.js';
import { smtpChannel } from './smtp.channel.js';

/** Resolve the active email channel from NOTIFY_PROVIDER. */
export function getEmailChannel(): NotificationChannelImpl {
  return env.NOTIFY_PROVIDER === 'smtp' ? smtpChannel : consoleChannel;
}
