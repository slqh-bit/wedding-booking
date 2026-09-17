import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_META_LIST, type Locale, type OfferingDTO, type ServiceCategory } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { GoldButton } from '@/design/GoldButton';
import { useToast } from '@/design/Toast';
import { AuthField } from '../auth/AuthField';

export interface OfferingFormValue {
  category: ServiceCategory;
  emoji: string;
  basePrice: number;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  imageUrls: string[];
}

const empty = (): OfferingFormValue => ({
  category: 'HALL',
  emoji: '✨',
  basePrice: 0,
  name: { ar: '', fr: '', en: '' },
  description: { ar: '', fr: '', en: '' },
  imageUrls: [],
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
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [v, setV] = useState<OfferingFormValue>(
    initial
      ? {
          category: initial.category,
          emoji: initial.emoji,
          basePrice: initial.basePrice,
          name: { ar: initial.name.ar, fr: initial.name.fr, en: initial.name.en },
          description: { ar: initial.description.ar, fr: initial.description.fr, en: initial.description.en },
          imageUrls: [...initial.imageUrls],
        }
      : empty(),
  );

  const setName = (l: Locale) => (val: string) => setV((p) => ({ ...p, name: { ...p.name, [l]: val } }));
  const setDesc = (l: Locale) => (val: string) => setV((p) => ({ ...p, description: { ...p.description, [l]: val } }));

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await endpoints.uploadImage(file);
      setV((p) => ({ ...p, imageUrls: [...p.imageUrls, url] }));
    } catch {
      toast.error(t('offeringImg.failed'));
    } finally {
      setUploading(false);
    }
  }
  const removeImage = (url: string) =>
    setV((p) => ({ ...p, imageUrls: p.imageUrls.filter((u) => u !== url) }));

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

      {/* Images */}
      <div className="mt-4">
        <span className="mb-2 block text-sm font-medium text-blush-700">{t('offeringImg.title')}</span>
        <div className="flex flex-wrap gap-2">
          {v.imageUrls.map((url) => (
            <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-gold-200">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute end-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500/90 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                aria-label="remove"
              >
                ✕
              </button>
            </div>
          ))}
          <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-gold-300 text-center text-[11px] text-gold-700 hover:bg-gold-50">
            {uploading ? '…' : `＋ ${t('offeringImg.add')}`}
            <input type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={uploading} />
          </label>
        </div>
        <p className="mt-1 text-[11px] text-blush-400">{t('offeringImg.hint')}</p>
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
