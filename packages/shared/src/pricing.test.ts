import { describe, expect, it } from 'vitest';
import { computeTotals, DEFAULT_FISCAL_CONFIG } from './pricing.js';

describe('computeTotals (Tunisian fiscal rules)', () => {
  it('applies TVA 19% + fixed Timbre Fiscal and a 30% deposit', () => {
    // subtotal = 1000 TND
    const r = computeTotals([{ unitPrice: 1000 }], {
      tvaRate: 0.19,
      timbreFiscalTnd: 1.0,
      depositRate: 0.3,
    });
    expect(r.subtotal).toBe(1000);
    expect(r.tva).toBe(190); // 1000 * 0.19
    expect(r.timbreFiscal).toBe(1);
    expect(r.total).toBe(1191); // 1000 + 190 + 1
    expect(r.deposit).toBe(357.3); // 1191 * 0.30
    expect(r.balance).toBe(833.7); // 1191 - 357.3
  });

  it('sums multiple lines with quantities', () => {
    const r = computeTotals(
      [
        { unitPrice: 500, quantity: 2 },
        { unitPrice: 250 },
      ],
      DEFAULT_FISCAL_CONFIG,
    );
    expect(r.subtotal).toBe(1250);
  });

  it('handles millime precision without float drift', () => {
    const r = computeTotals([{ unitPrice: 33.333 }], DEFAULT_FISCAL_CONFIG);
    // 33.333 * 0.19 = 6.33327 -> rounded to millimes = 6.333
    expect(r.tva).toBe(6.333);
    expect(r.subtotal).toBe(33.333);
  });

  it('returns zeros-plus-stamp for an empty cart', () => {
    const r = computeTotals([], DEFAULT_FISCAL_CONFIG);
    expect(r.subtotal).toBe(0);
    expect(r.tva).toBe(0);
    expect(r.total).toBe(1); // just the timbre fiscal
  });
});
