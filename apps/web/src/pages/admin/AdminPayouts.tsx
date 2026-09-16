import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { Skeleton } from '@/design/Skeleton';
import { useToast } from '@/design/Toast';

export function AdminPayouts() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['admin-payouts'], queryFn: endpoints.adminPayouts });

  const settle = useMutation({
    mutationFn: (vendorId: string) => endpoints.settleVendorPayout(vendorId),
    onSuccess: () => {
      toast.success(t('vendor.saved'));
      void qc.invalidateQueries({ queryKey: ['admin-payouts'] });
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
    return <p className="py-8 text-center text-sm text-blush-400">{t('payout.empty')}</p>;

  // Platform-wide totals across every vendor.
  const totals = data.reduce(
    (acc, v) => ({
      gross: acc.gross + v.gross,
      commission: acc.commission + v.commission,
      pendingNet: acc.pendingNet + v.pendingNet,
      paidNet: acc.paidNet + v.paidNet,
    }),
    { gross: 0, commission: 0, pendingNet: 0, paidNet: 0 },
  );

  const tiles = [
    { label: t('payout.gross'), value: money(totals.gross, locale), icon: '💰' },
    { label: t('payout.commission'), value: money(totals.commission, locale), icon: '🏦' },
    { label: t('payout.pending'), value: money(totals.pendingNet, locale), icon: '⏳' },
    { label: t('payout.paid'), value: money(totals.paidNet, locale), icon: '✅' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((c) => (
          <div key={c.label} className="surface p-5">
            <span className="text-2xl">{c.icon}</span>
            <p className="mt-2 font-display text-xl font-bold text-gold-foil">{c.value}</p>
            <p className="text-xs text-blush-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {data.map((v) => (
          <div key={v.vendorId} className="surface flex flex-wrap items-center gap-3 p-3.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold-50 text-lg">🏢</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-blush-900">{v.vendorName}</p>
              <p className="text-[11px] text-blush-400">
                {v.bookings} {t('payout.booking')} · {t('payout.gross')} {money(v.gross, locale)} ·{' '}
                {t('payout.commission')} {money(v.commission, locale)}
              </p>
            </div>
            <div className="text-end">
              <p className="text-xs text-blush-400">{t('payout.pending')}</p>
              <p className="font-display text-sm font-bold text-amber-600">{money(v.pendingNet, locale)}</p>
            </div>
            <div className="text-end">
              <p className="text-xs text-blush-400">{t('payout.paid')}</p>
              <p className="font-display text-sm font-bold text-emerald-600">{money(v.paidNet, locale)}</p>
            </div>
            <GoldButton
              size="sm"
              disabled={v.pendingNet <= 0}
              loading={settle.isPending && settle.variables === v.vendorId}
              onClick={() => settle.mutate(v.vendorId)}
            >
              {t('payout.markPaid')}
            </GoldButton>
          </div>
        ))}
      </div>
    </div>
  );
}
