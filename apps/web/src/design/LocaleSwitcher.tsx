import { useTranslation } from 'react-i18next';
import { LOCALES, type Locale } from '@hafalati/shared';
import { changeLocale } from '@/i18n';

const LABEL: Record<Locale, string> = { ar: 'ع', fr: 'FR', en: 'EN' };

export function LocaleSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language as Locale;

  return (
    <div className="flex items-center gap-1 rounded-full border border-gold-200 bg-white/70 p-0.5">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => void changeLocale(l)}
          className={`h-7 w-8 rounded-full text-xs font-bold transition ${
            current === l ? 'bg-gold-gradient text-white shadow' : 'text-gold-700 hover:bg-gold-50'
          }`}
          aria-pressed={current === l}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
