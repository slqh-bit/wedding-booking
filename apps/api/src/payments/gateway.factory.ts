import { env } from '../env.js';
import type { PaymentGateway } from './gateway.types.js';
import { mockGateway } from './mock.gateway.js';
import { konnectGateway } from './konnect.gateway.js';

/** Resolve the active payment gateway from PAYMENT_PROVIDER. */
export function getGateway(): PaymentGateway {
  switch (env.PAYMENT_PROVIDER) {
    case 'konnect':
      return konnectGateway;
    case 'mock':
    default:
      return mockGateway;
  }
}

export const isMockProvider = () => env.PAYMENT_PROVIDER === 'mock';
