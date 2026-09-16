import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { endpoints } from '@/lib/queries';
import { GoldButton } from '@/design/GoldButton';
import { Skeleton } from '@/design/Skeleton';
import { VendorStatusBadge } from '@/design/ModerationBadge';
import { useToast } from '@/design/Toast';

export function AdminVendors() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['admin-vendors'], queryFn: () => endpoints.adminVendors() });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => endpoints.setVendorStatus(id, status),
    onSuccess: () => {
      toast.success(t('vendor.saved'));
      void qc.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  if (isLoading)
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );

  return (
    <div className="space-y-2.5">
      {data?.map((v) => (
        <div key={v.id} className="surface flex flex-wrap items-center gap-3 p-3.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold-50 text-lg">🏢</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-blush-900">
              {v.name}
              {v.isPlatformOwned && <span className="ms-2 text-[10px] text-gold-600">(المنصّة)</span>}
            </p>
            <p className="text-[11px] text-blush-400">
              {v.city ?? '—'} · {v.offeringCount ?? 0} خدمة · {t('adminMarket.commission')}{' '}
              {Math.round(v.commissionRate * 100)}%
            </p>
          </div>
          <VendorStatusBadge status={v.status} />
          {!v.isPlatformOwned && (
            <div className="flex gap-2">
              {v.status !== 'APPROVED' && (
                <GoldButton
                  size="sm"
                  loading={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: v.id, status: 'APPROVED' })}
                >
                  {t('adminMarket.approve')}
                </GoldButton>
              )}
              {v.status === 'APPROVED' && (
                <GoldButton
                  size="sm"
                  variant="outline"
                  loading={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: v.id, status: 'SUSPENDED' })}
                >
                  {t('adminMarket.suspend')}
                </GoldButton>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
