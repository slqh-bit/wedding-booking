import { useTranslation } from 'react-i18next';

type Moderation = 'PENDING' | 'APPROVED' | 'REJECTED';
type VendorState = 'PENDING' | 'APPROVED' | 'SUSPENDED';

const styles: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  SUSPENDED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function ModerationBadge({ status }: { status: Moderation }) {
  const { t } = useTranslation();
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles[status]}`}>
      {t(`moderation.${status}`)}
    </span>
  );
}

export function VendorStatusBadge({ status }: { status: VendorState }) {
  const { t } = useTranslation();
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles[status]}`}>
      {t(`vendorStatus.${status}`)}
    </span>
  );
}
