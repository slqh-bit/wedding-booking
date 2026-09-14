import { formatTND, tr, type Locale, type LocalizedString } from '@hafalati/shared';

export function money(amount: number, locale: string): string {
  return formatTND(amount, (locale as Locale) ?? 'ar');
}

export function loc(value: LocalizedString | undefined | null, locale: string): string {
  return tr(value, (locale as Locale) ?? 'ar');
}
