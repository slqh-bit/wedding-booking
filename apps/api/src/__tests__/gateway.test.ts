/** Gateway factory selection (no network). */
import { afterEach, describe, expect, it } from 'vitest';
import { getGateway, isMockProvider } from '../payments/gateway.factory.js';

const original = process.env.PAYMENT_PROVIDER;
afterEach(() => {
  if (original === undefined) delete process.env.PAYMENT_PROVIDER;
  else process.env.PAYMENT_PROVIDER = original;
});

describe('getGateway', () => {
  it.each([
    ['mock', 'mock'],
    ['konnect', 'konnect'],
    ['flouci', 'flouci'],
    ['d17', 'd17'],
  ])('selects %s → %s', (env, name) => {
    process.env.PAYMENT_PROVIDER = env;
    expect(getGateway().name).toBe(name);
  });

  it('defaults to mock for unknown/empty', () => {
    process.env.PAYMENT_PROVIDER = '';
    expect(getGateway().name).toBe('mock');
    expect(isMockProvider()).toBe(true);
  });
});
