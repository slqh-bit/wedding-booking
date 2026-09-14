/**
 * Fiscal / pricing engine (Tunisia) — the single source of truth used by both
 * the API (authoritative totals) and the web (display preview).
 *
 * Tunisian rules:
 *  - TVA (VAT) at 19% on the subtotal.
 *  - Timbre Fiscal: a fixed stamp duty in TND added to the invoice total.
 *  - Deposit: a configurable fraction of the grand total, collected to confirm.
 *
 * All money is handled in millimes (integer, 1 TND = 1000 millimes) to avoid
 * floating-point drift, then formatted back to TND for display.
 */

export const MILLIMES_PER_DINAR = 1000;

export interface FiscalConfig {
  /** e.g. 0.19 */
  tvaRate: number;
  /** Fixed stamp in TND, e.g. 1.0 */
  timbreFiscalTnd: number;
  /** Deposit fraction of the grand total, e.g. 0.30 */
  depositRate: number;
}

export const DEFAULT_FISCAL_CONFIG: FiscalConfig = {
  tvaRate: 0.19,
  timbreFiscalTnd: 1.0,
  depositRate: 0.3,
};

export interface PriceLine {
  /** Unit price in TND. */
  unitPrice: number;
  /** Defaults to 1. */
  quantity?: number;
}

/** All amounts in the breakdown are TND numbers rounded to 3 decimals (millime precision). */
export interface FiscalBreakdown {
  subtotal: number;
  tva: number;
  timbreFiscal: number;
  total: number;
  deposit: number;
  balance: number;
}

export function toMillimes(tnd: number): number {
  return Math.round(tnd * MILLIMES_PER_DINAR);
}

export function toDinars(millimes: number): number {
  return Math.round(millimes) / MILLIMES_PER_DINAR;
}

/**
 * Compute the full fiscal breakdown from a set of price lines.
 * Rounding is done in millimes at each step so the API and web agree exactly.
 */
export function computeTotals(
  lines: readonly PriceLine[],
  config: FiscalConfig = DEFAULT_FISCAL_CONFIG,
): FiscalBreakdown {
  const subtotalM = lines.reduce(
    (sum, line) => sum + toMillimes(line.unitPrice) * (line.quantity ?? 1),
    0,
  );
  const tvaM = Math.round(subtotalM * config.tvaRate);
  const timbreM = toMillimes(config.timbreFiscalTnd);
  const totalM = subtotalM + tvaM + timbreM;
  const depositM = Math.round(totalM * config.depositRate);
  const balanceM = totalM - depositM;

  return {
    subtotal: toDinars(subtotalM),
    tva: toDinars(tvaM),
    timbreFiscal: toDinars(timbreM),
    total: toDinars(totalM),
    deposit: toDinars(depositM),
    balance: toDinars(balanceM),
  };
}
