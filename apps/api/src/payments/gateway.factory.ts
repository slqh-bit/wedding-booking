import { env } from '../env.js';
import type { PaymentGateway } from './gateway.types.js';
import { mockGateway } from './mock.gateway.js';
import { konnectGateway } from './konnect.gateway.js';
import { flouciGateway } from './flouci.gateway.js';
import { d17Gateway } from './d17.gateway.js';

/** The active provider, read from process.env at call time (overridable in tests). */
function provider(): string {
  return (process.env.PAYMENT_PROVIDER || env.PAYMENT_PROVIDER || 'mock').toLowerCase();
}

/** Resolve the active payment gateway from PAYMENT_PROVIDER. */
export function getGateway(): PaymentGateway {
  switch (provider()) {
    case 'konnect':
      return konnectGateway;
    case 'flouci':
      return flouciGateway;
    case 'd17':
      return d17Gateway;
    case 'mock':
    default:
      return mockGateway;
  }
}

export const isMockProvider = () => provider() === 'mock';
