import type { Locale } from './i18n.js';

/** BCP-47 tags used for number formatting per app locale. */
const NUMBER_LOCALE: Record<Locale, string> = {
  ar: 'ar-TN',
  fr: 'fr-TN',
  en: 'en-TN',
};

/** Localized currency symbol / suffix for the Tunisian Dinar. */
const TND_SUFFIX: Record<Locale, string> = {
  ar: 'د.ت',
  fr: 'DT',
  en: 'TND',
};

/**
 * Format a TND amount for display. Tunisian dinar has 3 decimal places
 * (millimes), but we trim trailing zeros for round dinar amounts so prices
 * read cleanly (e.g. "1 500 د.ت" not "1 500,000 د.ت").
 */
export function formatTND(amount: number, locale: Locale = 'ar'): string {
  const hasFraction = Math.round(amount * 1000) % 1000 !== 0;
  const nf = new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    minimumFractionDigits: hasFraction ? 3 : 0,
    maximumFractionDigits: 3,
  });
  return `${nf.format(amount)} ${TND_SUFFIX[locale]}`;
}
