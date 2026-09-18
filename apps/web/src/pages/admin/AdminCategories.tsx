import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc } from '@/lib/format';
import { Skeleton } from '@/design/Skeleton';
import { useToast } from '@/design/Toast';

/**
 * Admin toggle of which service categories are "date-limited". A date-limited
 * category (hall, photographer, …) can only be booked once per day, so the
 * wizard hides options already reserved on the customer's date. Product-like
 * categories (flowers, cake, …) are left unlimited and always shown.
 */
export function AdminCategories() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: endpoints.adminCategories,
  });

  const toggle = useMutation({
    mutationFn: ({ category, dateLimited }: { category: string; dateLimited: boolean }) =>
      endpoints.setCategoryLimited(category, dateLimited),
    onSuccess: () => {
      toast.success(t('adminCategories.saved'));
      void qc.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  if (isLoading)
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );

  return (
    <div>
      <p className="mb-4 rounded-2xl border border-gold-100 bg-gold-50/60 p-3.5 text-sm text-gold-800">
        {t('adminCategories.intro')}
      </p>
      <div className="space-y-2.5">
        {data?.map((c) => (
          <div key={c.category} className="surface flex items-center gap-3 p-3.5">
            <span className="text-2xl">{c.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-blush-900">{loc(c.label, locale)}</p>
              <p className="text-[11px] text-blush-400">
                {c.dateLimited ? t('adminCategories.limited') : t('adminCategories.unlimited')}
              </p>
            </div>
            <Switch
              on={c.dateLimited}
              disabled={toggle.isPending}
              onToggle={() => toggle.mutate({ category: c.category, dateLimited: !c.dateLimited })}
              label={loc(c.label, locale)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Animated gold on/off switch. */
function Switch({
  on,
  disabled,
  onToggle,
  label,
}: {
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        on ? 'bg-gold-gradient' : 'bg-gold-100'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[22px] rtl:-translate-x-[22px]' : 'translate-x-0.5 rtl:-translate-x-0.5'
        }`}
      />
    </button>
  );
}
