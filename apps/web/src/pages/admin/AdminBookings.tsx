import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { BookingDTO, Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { StatusBadge } from '@/design/StatusBadge';
import { Skeleton } from '@/design/Skeleton';
import { useToast } from '@/design/Toast';

export function AdminBookings() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => endpoints.adminBookings(),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-bookings'] });
    void qc.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const confirmPayment = useMutation({
    mutationFn: (paymentId: string) => endpoints.confirmPayment(paymentId),
    onSuccess: () => {
      toast.success(t('status.CONFIRMED'));
      invalidate();
    },
    onError: () => toast.error(t('common.error')),
  });

  const complete = useMutation({
    mutationFn: (id: string) => endpoints.setBookingStatus(id, 'COMPLETED'),
    onSuccess: () => {
      toast.success(t('status.COMPLETED'));
      invalidate();
    },
    onError: () => toast.error(t('common.error')),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data?.length === 0 && <p className="text-center text-sm text-blush-400">—</p>}
      {data?.map((b) => (
        <Row
          key={b.id}
          booking={b}
          locale={locale}
          onConfirmPayment={(pid) => confirmPayment.mutate(pid)}
          onComplete={() => complete.mutate(b.id)}
          busy={confirmPayment.isPending || complete.isPending}
        />
      ))}
    </div>
  );
}

function Row({
  booking,
  locale,
  onConfirmPayment,
  onComplete,
  busy,
}: {
  booking: BookingDTO;
  locale: Locale;
  onConfirmPayment: (paymentId: string) => void;
  onComplete: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const pendingPayment = booking.payments.find((p) => p.status === 'PENDING');

  return (
    <div className="surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold tracking-wide text-gold-foil">{booking.reference}</span>
          <StatusBadge status={booking.status} />
        </div>
        <div className="text-end text-xs text-blush-400">
          {t(`eventTypes.${booking.eventType}`)} · {booking.eventDate}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {booking.items.map((it) => (
          <span key={it.id} className="rounded-full bg-ivory-100 px-2 py-0.5 text-xs text-blush-700">
            {it.emoji} {loc(it.name, locale)}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gold-100 pt-3">
        <span className="text-sm">
          <span className="text-blush-400">{t('summary.total')}: </span>
          <span className="font-bold text-gold-700">{money(booking.fiscal.total, locale)}</span>
          <span className="ms-2 text-blush-400">{t('summary.deposit')}: </span>
          <span className="font-semibold text-blush-700">{money(booking.fiscal.deposit, locale)}</span>
        </span>
        <div className="flex gap-2">
          {pendingPayment && (
            <GoldButton size="sm" loading={busy} onClick={() => onConfirmPayment(pendingPayment.id)}>
              {t('admin.confirmPayment')}
            </GoldButton>
          )}
          {booking.status === 'CONFIRMED' && (
            <GoldButton size="sm" variant="outline" loading={busy} onClick={onComplete}>
              {t('admin.markCompleted')}
            </GoldButton>
          )}
        </div>
      </div>
    </div>
  );
}
