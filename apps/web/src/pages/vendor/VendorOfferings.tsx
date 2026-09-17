import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isDateBound, type Locale, type OfferingDTO } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { Skeleton } from '@/design/Skeleton';
import { ModerationBadge } from '@/design/ModerationBadge';
import { useToast } from '@/design/Toast';
import { OfferingForm, type OfferingFormValue } from './OfferingForm';

export function VendorOfferings() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<OfferingDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['vendor-offerings'], queryFn: endpoints.vendorOfferings });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor-offerings'] });

  const save = useMutation({
    mutationFn: (v: OfferingFormValue) => {
      const body = { ...v, attributes: {} };
      return editing
        ? endpoints.updateVendorOffering(editing.id, body)
        : endpoints.createVendorOffering(body);
    },
    onSuccess: () => {
      toast.success(t('vendor.saved'));
      setEditing(null);
      setCreating(false);
      void invalidate();
    },
    onError: () => toast.error(t('common.error')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.deleteVendorOffering(id),
    onSuccess: () => void invalidate(),
    onError: () => toast.error(t('common.error')),
  });

  const openDates = useMutation({
    mutationFn: (id: string) => {
      const from = new Date().toISOString().slice(0, 10);
      const to = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
      return endpoints.setVendorAvailability(id, from, to, true);
    },
    onSuccess: () => toast.success(t('vendor.availabilityOpened')),
    onError: () => toast.error(t('common.error')),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (editing || creating) {
    return (
      <OfferingForm
        initial={editing ?? undefined}
        saving={save.isPending}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSubmit={(v) => save.mutate(v)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <GoldButton size="sm" onClick={() => setCreating(true)}>
          + {t('vendor.addOffering')}
        </GoldButton>
      </div>
      {data && data.length === 0 && (
        <p className="py-8 text-center text-sm text-blush-400">{t('vendor.noOfferings')}</p>
      )}
      <div className="space-y-2.5">
        {data?.map((o) => (
          <div key={o.id} className="surface flex flex-wrap items-center gap-3 p-3.5">
            {o.imageUrls[0] ? (
              <img src={o.imageUrls[0]} alt="" className="h-11 w-11 rounded-xl object-cover" />
            ) : (
              <span className="text-2xl">{o.emoji}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-blush-900">{loc(o.name, locale)}</p>
              <p className="text-[11px] text-blush-400">{money(o.basePrice, locale)}</p>
            </div>
            <ModerationBadge status={o.moderationStatus} />
            {isDateBound(o.category) && (
              <GoldButton
                variant="ghost"
                size="sm"
                loading={openDates.isPending}
                onClick={() => openDates.mutate(o.id)}
              >
                📅
              </GoldButton>
            )}
            <GoldButton variant="outline" size="sm" onClick={() => setEditing(o)}>
              {t('vendor.editOffering')}
            </GoldButton>
            <GoldButton
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(t('vendor.deleteConfirm'))) remove.mutate(o.id);
              }}
            >
              {t('vendor.delete')}
            </GoldButton>
          </div>
        ))}
      </div>
    </div>
  );
}
