import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { Skeleton } from '@/design/Skeleton';
import { useToast } from '@/design/Toast';

export function AdminModeration() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-moderation'],
    queryFn: () => endpoints.adminOfferingsByModeration('PENDING'),
  });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => endpoints.setOfferingModeration(id, status),
    onSuccess: () => {
      toast.success(t('vendor.saved'));
      void qc.invalidateQueries({ queryKey: ['admin-moderation'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  if (isLoading)
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );

  if (!data || data.length === 0)
    return <p className="py-8 text-center text-sm text-blush-400">{t('adminMarket.noPending')}</p>;

  return (
    <div className="space-y-2.5">
      {data.map((o) => (
        <div key={o.id} className="surface flex flex-wrap items-center gap-3 p-3.5">
          <span className="text-2xl">{o.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-blush-900">{loc(o.name, locale)}</p>
            <p className="text-[11px] text-blush-400">
              {t('adminMarket.by')}: {o.vendorName} · {money(o.basePrice, locale)}
            </p>
          </div>
          <GoldButton
            size="sm"
            loading={moderate.isPending}
            onClick={() => moderate.mutate({ id: o.id, status: 'APPROVED' })}
          >
            {t('adminMarket.approve')}
          </GoldButton>
          <GoldButton
            size="sm"
            variant="outline"
            loading={moderate.isPending}
            onClick={() => moderate.mutate({ id: o.id, status: 'REJECTED' })}
          >
            {t('adminMarket.reject')}
          </GoldButton>
        </div>
      ))}
    </div>
  );
}
