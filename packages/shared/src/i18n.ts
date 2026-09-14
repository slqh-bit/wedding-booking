/**
 * Trilingual localization primitives shared by API + web.
 * Arabic is the default and drives RTL layout; French & English are LTR.
 */

export const LOCALES = ['ar', 'fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ar';

export const RTL_LOCALES: readonly Locale[] = ['ar'];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** A string translated into every supported locale (stored as JSON in the DB). */
export type LocalizedString = Record<Locale, string>;

/** Resolve a localized value, falling back to Arabic then any available string. */
export function tr(value: LocalizedString | null | undefined, locale: Locale): string {
  if (!value) return '';
  return value[locale] || value[DEFAULT_LOCALE] || Object.values(value).find(Boolean) || '';
}

/** Build a LocalizedString, filling missing locales from the Arabic (or first) value. */
export function localized(input: Partial<LocalizedString>): LocalizedString {
  const fallback = input.ar ?? input.fr ?? input.en ?? '';
  return {
    ar: input.ar ?? fallback,
    fr: input.fr ?? fallback,
    en: input.en ?? fallback,
  };
}
