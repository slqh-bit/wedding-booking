import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CATEGORY_META, type Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { Skeleton } from '@/design/Skeleton';
import { ComingSoonBadge } from '@/design/ComingSoon';

export function AdminOfferings() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-offerings'],
    queryFn: endpoints.adminOfferings,
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-dashed border-gold-300 bg-gold-50 p-3 text-sm text-gold-700">
        <ComingSoonBadge />
        <span>إضافة / تعديل الخدمات والصور من الواجهة — قيد التطوير (الـ API جاهز).</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((o) => (
          <div key={o.id} className="surface flex items-center gap-3 p-3">
            <span className="text-2xl">{o.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-blush-900">{loc(o.name, locale)}</p>
              <p className="text-[11px] text-blush-400">{CATEGORY_META[o.category].label[locale]}</p>
            </div>
            <span className="text-sm font-bold text-gold-700">{money(o.basePrice, locale)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
