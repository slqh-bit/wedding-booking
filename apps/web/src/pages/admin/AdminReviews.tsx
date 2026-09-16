import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { Skeleton } from '@/design/Skeleton';
import { Stars } from '@/design/Stars';
import { useToast } from '@/design/Toast';

export function AdminReviews() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['admin-reviews'], queryFn: () => endpoints.adminReviews() });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => endpoints.setReviewStatus(id, status),
    onSuccess: () => {
      toast.success(t('vendor.saved'));
      void qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  if (isLoading)
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );

  if (!data || data.length === 0)
    return <p className="py-8 text-center text-sm text-blush-400">{t('review.empty')}</p>;

  return (
    <div className="space-y-2.5">
      {data.map((r) => (
        <div key={r.id} className="surface p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Stars value={r.rating} size="sm" />
              <span className="text-xs font-semibold text-blush-900">{loc(r.offeringName, locale)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  r.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {t(`review.${r.status}`)}
              </span>
              {r.status === 'PUBLISHED' ? (
                <GoldButton
                  size="sm"
                  variant="outline"
                  loading={moderate.isPending}
                  onClick={() => moderate.mutate({ id: r.id, status: 'HIDDEN' })}
                >
                  {t('review.hide')}
                </GoldButton>
              ) : (
                <GoldButton
                  size="sm"
                  loading={moderate.isPending}
                  onClick={() => moderate.mutate({ id: r.id, status: 'PUBLISHED' })}
                >
                  {t('review.publish')}
                </GoldButton>
              )}
            </div>
          </div>
          {r.comment && <p className="mt-1.5 text-xs text-blush-600">“{r.comment}”</p>}
          <p className="mt-1 text-[11px] text-blush-400">
            {t('review.by')} {r.authorName} · {r.createdAt.slice(0, 10)}
          </p>
        </div>
      ))}
    </div>
  );
}
