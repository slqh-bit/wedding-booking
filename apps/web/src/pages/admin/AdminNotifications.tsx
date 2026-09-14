import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NotificationDTO } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { Skeleton } from '@/design/Skeleton';

const statusStyle: Record<NotificationDTO['status'], string> = {
  SENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const channelIcon: Record<NotificationDTO['channel'], string> = {
  EMAIL: '📧',
  SMS: '💬',
  WHATSAPP: '🟢',
};

export function AdminNotifications() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: endpoints.adminNotifications,
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

  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-blush-400">{t('admin.notifEmpty')}</p>;
  }

  return (
    <div className="space-y-2.5">
      {data.map((n) => (
        <div key={n.id} className="surface flex items-center gap-3 p-3.5">
          <span className="text-xl">{channelIcon[n.channel]}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-blush-900">{n.subject}</p>
            <p className="text-[11px] text-blush-400">
              {t(`admin.notifType.${n.type}`)}
              {n.bookingRef ? ` · ${n.bookingRef}` : ''} · {n.to} ·{' '}
              {new Date(n.createdAt).toLocaleString()}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusStyle[n.status]}`}
          >
            {t(`admin.notifStatus.${n.status}`)}
          </span>
        </div>
      ))}
    </div>
  );
}
