import { useTranslation } from 'react-i18next';
import { CATEGORY_META, type Locale, type OfferingDTO } from '@hafalati/shared';
import { loc, money } from '@/lib/format';

interface Props {
  offering: OfferingDTO;
  selected: boolean;
  onSelect: (o: OfferingDTO) => void;
}

export function OfferingCard({ offering, selected, onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const meta = CATEGORY_META[offering.category];
  const badge = String(offering.attributes[meta.badgeAttr] ?? '');

  return (
    <button
      onClick={() => onSelect(offering)}
      className={`group surface relative overflow-hidden text-start transition-all duration-300 hover:-translate-y-1.5 hover:shadow-gold ${
        selected ? 'ring-2 ring-gold-400 ring-offset-2' : ''
      }`}
    >
      {selected && (
        <span className="absolute end-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-gold-gradient text-sm text-white shadow">
          ✓
        </span>
      )}
      <div
        className={`flex h-32 items-center justify-center bg-gradient-to-br ${meta.theme.gradientFrom} ${meta.theme.gradientTo} text-5xl transition-transform duration-300 group-hover:scale-105`}
      >
        {offering.emoji}
      </div>
      <div className="p-4">
        <h4 className="font-display text-base font-bold text-blush-900">{loc(offering.name, locale)}</h4>
        <p className="mt-0.5 line-clamp-2 text-xs text-blush-500">{loc(offering.description, locale)}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          {badge && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.theme.badgeBg} ${meta.theme.badgeText}`}
            >
              {badge}
            </span>
          )}
          <span className="ms-auto text-sm font-bold text-gold-700">
            <span className="text-[10px] font-normal text-blush-400">{t('wizard.startingPrice')} </span>
            {money(offering.basePrice, locale)}
          </span>
        </div>
      </div>
    </button>
  );
}
