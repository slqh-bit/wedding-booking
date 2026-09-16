import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_META_LIST, type Locale, type OfferingDTO, type ServiceCategory } from '@hafalati/shared';
import { GoldButton } from '@/design/GoldButton';
import { AuthField } from '../auth/AuthField';

export interface OfferingFormValue {
  category: ServiceCategory;
  emoji: string;
  basePrice: number;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
}

const empty = (): OfferingFormValue => ({
  category: 'HALL',
  emoji: '✨',
  basePrice: 0,
  name: { ar: '', fr: '', en: '' },
  description: { ar: '', fr: '', en: '' },
});

export function OfferingForm({
  initial,
  onSubmit,
  onCancel,
  saving,
}: {
  initial?: OfferingDTO;
  onSubmit: (v: OfferingFormValue) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const [v, setV] = useState<OfferingFormValue>(
    initial
      ? {
          category: initial.category,
          emoji: initial.emoji,
          basePrice: initial.basePrice,
          name: { ar: initial.name.ar, fr: initial.name.fr, en: initial.name.en },
          description: { ar: initial.description.ar, fr: initial.description.fr, en: initial.description.en },
        }
      : empty(),
  );

  const setName = (l: Locale) => (val: string) => setV((p) => ({ ...p, name: { ...p.name, [l]: val } }));
  const setDesc = (l: Locale) => (val: string) => setV((p) => ({ ...p, description: { ...p.description, [l]: val } }));

  return (
    <div className="surface p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-blush-700">{t('vendor.category')}</span>
          <select
            value={v.category}
            onChange={(e) => setV((p) => ({ ...p, category: e.target.value as ServiceCategory }))}
            className="w-full rounded-xl border border-gold-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
          >
            {CATEGORY_META_LIST.map((c) => (
              <option key={c.category} value={c.category}>
                {c.emoji} {c.label[locale]}
              </option>
            ))}
          </select>
        </label>
        <AuthField
          label={t('vendor.price')}
          type="number"
          value={String(v.basePrice)}
          onChange={(val) => setV((p) => ({ ...p, basePrice: Number(val) || 0 }))}
          dir="ltr"
        />
        <AuthField label={`${t('vendor.name')} (ع)`} value={v.name.ar} onChange={setName('ar')} required />
        <AuthField label={`${t('vendor.name')} (FR)`} value={v.name.fr} onChange={setName('fr')} required />
        <AuthField label={`${t('vendor.name')} (EN)`} value={v.name.en} onChange={setName('en')} required />
        <AuthField label="Emoji" value={v.emoji} onChange={(val) => setV((p) => ({ ...p, emoji: val }))} dir="ltr" />
        <AuthField label={`${t('vendor.description')} (ع)`} value={v.description.ar} onChange={setDesc('ar')} />
        <AuthField label={`${t('vendor.description')} (FR)`} value={v.description.fr} onChange={setDesc('fr')} />
        <AuthField label={`${t('vendor.description')} (EN)`} value={v.description.en} onChange={setDesc('en')} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <GoldButton variant="ghost" size="sm" onClick={onCancel}>
          {t('vendor.cancel')}
        </GoldButton>
        <GoldButton size="sm" loading={saving} onClick={() => onSubmit(v)}>
          {t('vendor.save')}
        </GoldButton>
      </div>
    </div>
  );
}
