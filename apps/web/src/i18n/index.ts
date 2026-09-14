import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, dirFor, isLocale, type Locale } from '@hafalati/shared';
import ar from './locales/ar.json';
import fr from './locales/fr.json';
import en from './locales/en.json';

const STORAGE_KEY = 'hafalati.locale';

export function getStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isLocale(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function applyLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  const html = document.documentElement;
  html.lang = locale;
  html.dir = dirFor(locale);
}

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: getStoredLocale(),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
});

applyLocale(getStoredLocale());

export async function changeLocale(locale: Locale) {
  await i18n.changeLanguage(locale);
  applyLocale(locale);
}

export default i18n;
