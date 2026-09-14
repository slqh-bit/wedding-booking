import { useTranslation } from 'react-i18next';
import type { BookingStatus } from '@hafalati/shared';

const styles: Record<BookingStatus, string> = {
  DRAFT: 'bg-gold-50 text-gold-700 border-gold-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  COMPLETED: 'bg-sky-50 text-sky-700 border-sky-200',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles[status]}`}>
      {t(`status.${status}`)}
    </span>
  );
}
