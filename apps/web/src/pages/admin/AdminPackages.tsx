import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CATEGORY_META,
  CATEGORY_META_LIST,
  type Locale,
  type OfferingDTO,
  type PackageDTO,
} from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { Skeleton } from '@/design/Skeleton';
import { AuthField } from '../auth/AuthField';
import { useToast } from '@/design/Toast';

export function AdminPackages() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['admin-packages'], queryFn: endpoints.adminPackages });
  const [editing, setEditing] = useState<PackageDTO | 'new' | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => endpoints.deletePackage(id),
    onSuccess: () => {
      toast.success(t('adminPkg.deleted'));
      void qc.invalidateQueries({ queryKey: ['admin-packages'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      endpoints.updatePackage(id, { isActive }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-packages'] }),
    onError: () => toast.error(t('common.error')),
  });

  if (editing) {
    return (
      <PackageForm
        initial={editing === 'new' ? undefined : editing}
        onDone={() => {
          setEditing(null);
          void qc.invalidateQueries({ queryKey: ['admin-packages'] });
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <GoldButton size="sm" onClick={() => setEditing('new')}>
          ➕ {t('adminPkg.new')}
        </GoldButton>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="py-8 text-center text-sm text-blush-400">{t('packages.empty')}</p>
      ) : (
        data.map((p) => (
          <div key={p.id} className="surface flex flex-wrap items-center gap-3 p-3.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold-50 text-lg">{p.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-blush-900">
                {loc(p.name, locale)}
                <span className="ms-2 rounded-full bg-gold-gradient px-2 py-0.5 text-[10px] font-bold text-white">
                  −{Math.round(p.discountRate * 100)}%
                </span>
              </p>
              <p className="text-[11px] text-blush-400">
                {p.offerings.length} · {money(p.discountedTotal, locale)}{' '}
                <span className="line-through">{money(p.originalTotal, locale)}</span>
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {p.isActive ? t('adminPkg.active') : t('adminPkg.inactive')}
            </span>
            <div className="flex gap-2">
              <GoldButton
                size="sm"
                variant="outline"
                loading={toggle.isPending}
                onClick={() => toggle.mutate({ id: p.id, isActive: !p.isActive })}
              >
                {p.isActive ? t('adminPkg.deactivate') : t('adminPkg.activate')}
              </GoldButton>
              <GoldButton size="sm" variant="ghost" onClick={() => setEditing(p)}>
                ✏️
              </GoldButton>
              <GoldButton
                size="sm"
                variant="ghost"
                loading={del.isPending}
                onClick={() => {
                  if (confirm(t('adminPkg.deleteConfirm'))) del.mutate(p.id);
                }}
              >
                🗑️
              </GoldButton>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PackageForm({ initial, onDone }: { initial?: PackageDTO; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const toast = useToast();
  const { data: offerings, isLoading } = useQuery({
    queryKey: ['admin-offerings'],
    queryFn: endpoints.adminOfferings,
  });

  const [name, setName] = useState<Record<Locale, string>>(
    initial ? { ...initial.name } : { ar: '', fr: '', en: '' },
  );
  const [description, setDescription] = useState<Record<Locale, string>>(
    initial ? { ...initial.description } : { ar: '', fr: '', en: '' },
  );
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🎁');
  const [discountPct, setDiscountPct] = useState(initial ? Math.round(initial.discountRate * 100) : 10);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initial?.offerings.map((o) => o.id) ?? []),
  );
  const [catFilter, setCatFilter] = useState<string>('');

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name,
        description,
        emoji,
        discountRate: discountPct / 100,
        isActive: initial?.isActive ?? true,
        offeringIds: [...selected],
      };
      return initial ? endpoints.updatePackage(initial.id, body) : endpoints.createPackage(body);
    },
    onSuccess: () => {
      toast.success(t('adminPkg.saved'));
      onDone();
    },
    onError: () => toast.error(t('common.error')),
  });

  const canSave =
    selected.size >= 2 &&
    name.ar &&
    name.fr &&
    name.en &&
    description.ar &&
    description.fr &&
    description.en &&
    discountPct >= 0 &&
    discountPct <= 90;

  const shown = (offerings ?? []).filter((o) => (catFilter ? o.category === catFilter : true));

  return (
    <div className="surface space-y-4 p-5">
      <h3 className="font-display text-lg font-bold text-blush-900">
        {initial ? t('adminPkg.edit') : t('adminPkg.new')}
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AuthField label={`${t('adminPkg.name')} (ع)`} value={name.ar} onChange={(v) => setName((p) => ({ ...p, ar: v }))} required />
        <AuthField label={`${t('adminPkg.name')} (FR)`} value={name.fr} onChange={(v) => setName((p) => ({ ...p, fr: v }))} required />
        <AuthField label={`${t('adminPkg.name')} (EN)`} value={name.en} onChange={(v) => setName((p) => ({ ...p, en: v }))} required />
        <AuthField label="Emoji" value={emoji} onChange={setEmoji} dir="ltr" />
        <AuthField label={`${t('adminPkg.description')} (ع)`} value={description.ar} onChange={(v) => setDescription((p) => ({ ...p, ar: v }))} />
        <AuthField label={`${t('adminPkg.description')} (FR)`} value={description.fr} onChange={(v) => setDescription((p) => ({ ...p, fr: v }))} />
        <AuthField label={`${t('adminPkg.description')} (EN)`} value={description.en} onChange={(v) => setDescription((p) => ({ ...p, en: v }))} />
        <AuthField
          label={`${t('adminPkg.discount')} (%)`}
          type="number"
          value={String(discountPct)}
          onChange={(v) => setDiscountPct(Number(v) || 0)}
          dir="ltr"
        />
      </div>

      {/* Offering picker */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-blush-700">
            {t('adminPkg.selectServices')} · {selected.size}
          </span>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="rounded-full border border-gold-200 bg-white px-3 py-1 text-xs outline-none focus:border-gold-400"
          >
            <option value="">{t('browse.all')}</option>
            {CATEGORY_META_LIST.map((c) => (
              <option key={c.category} value={c.category}>
                {c.emoji} {c.label[locale]}
              </option>
            ))}
          </select>
        </div>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-gold-100 bg-ivory-50 p-2">
            {shown.map((o: OfferingDTO) => {
              const on = selected.has(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(o.id)) next.delete(o.id);
                      else next.add(o.id);
                      return next;
                    })
                  }
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-xs transition ${
                    on ? 'bg-gold-100 text-blush-900' : 'hover:bg-white text-blush-700'
                  }`}
                >
                  <span className="grid h-4 w-4 place-items-center rounded border border-gold-300 text-[9px]">
                    {on ? '✓' : ''}
                  </span>
                  <span>{o.emoji}</span>
                  <span className="flex-1 truncate">{loc(o.name, locale)}</span>
                  <span className="text-[10px] text-blush-400">{CATEGORY_META[o.category].emoji}</span>
                  <span className="text-blush-500">{money(o.basePrice, locale)}</span>
                </button>
              );
            })}
          </div>
        )}
        {selected.size < 2 && <p className="mt-1 text-[11px] text-rose-500">{t('adminPkg.needTwo')}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <GoldButton variant="ghost" size="sm" onClick={onDone}>
          {t('vendor.cancel')}
        </GoldButton>
        <GoldButton size="sm" disabled={!canSave} loading={save.isPending} onClick={() => save.mutate()}>
          {t('vendor.save')}
        </GoldButton>
      </div>
    </div>
  );
}
