import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  type Locale,
  type OfferingDTO,
  type ServiceCategory,
} from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { Skeleton } from '@/design/Skeleton';
import { Stars, StarInput } from '@/design/Stars';
import { OrnamentDivider } from '@/design/Ornament';

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'rating_desc';

interface Filters {
  q: string;
  category: ServiceCategory | '';
  minPrice: string;
  maxPrice: string;
  minRating: number;
  sort: SortKey;
}

const EMPTY: Filters = { q: '', category: '', minPrice: '', maxPrice: '', minRating: 0, sort: 'newest' };
const PAGE_SIZE = 12;

export function Browse() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<OfferingDTO[]>([]);

  // Any filter change restarts pagination.
  const patch = (p: Partial<Filters>) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...p }));
  };

  const { data, isFetching } = useQuery({
    queryKey: ['search', filters, page],
    queryFn: () =>
      endpoints.searchOfferings({
        q: filters.q || undefined,
        category: filters.category || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        minRating: filters.minRating || undefined,
        sort: filters.sort,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  useEffect(() => {
    if (!data) return;
    setItems((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
  }, [data, page]);

  const total = data?.total ?? 0;
  const hasMore = items.length < total;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-blush-900">{t('browse.title')}</h1>
      <p className="mt-1 text-sm text-blush-500">{t('browse.subtitle')}</p>

      <OrnamentDivider />

      {/* Filters */}
      <div className="surface space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={filters.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder={t('browse.searchPlaceholder')}
            className="flex-1 rounded-full border border-gold-200 bg-white px-4 py-2 text-sm text-blush-800 focus:border-gold-400 focus:outline-none"
          />
          <select
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as SortKey })}
            className="rounded-full border border-gold-200 bg-white px-4 py-2 text-sm text-blush-700 focus:border-gold-400 focus:outline-none"
          >
            <option value="newest">{t('browse.sortNewest')}</option>
            <option value="price_asc">{t('browse.sortPriceAsc')}</option>
            <option value="price_desc">{t('browse.sortPriceDesc')}</option>
            <option value="rating_desc">{t('browse.sortRating')}</option>
          </select>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filters.category === ''} onClick={() => patch({ category: '' })}>
            {t('browse.all')}
          </Chip>
          {CATEGORY_ORDER.map((c) => (
            <Chip key={c} active={filters.category === c} onClick={() => patch({ category: c })}>
              {CATEGORY_META[c].emoji} {loc(CATEGORY_META[c].label, locale)}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blush-500">{t('browse.price')}</span>
            <input
              type="number"
              inputMode="numeric"
              value={filters.minPrice}
              onChange={(e) => patch({ minPrice: e.target.value })}
              placeholder={t('browse.from')}
              className="w-24 rounded-lg border border-gold-200 bg-white px-2 py-1 text-sm focus:border-gold-400 focus:outline-none"
            />
            <span className="text-blush-300">—</span>
            <input
              type="number"
              inputMode="numeric"
              value={filters.maxPrice}
              onChange={(e) => patch({ maxPrice: e.target.value })}
              placeholder={t('browse.to')}
              className="w-24 rounded-lg border border-gold-200 bg-white px-2 py-1 text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blush-500">{t('browse.minRating')}</span>
            <StarInput value={filters.minRating} onChange={(v) => patch({ minRating: v })} size="md" />
            {filters.minRating > 0 && (
              <button
                className="text-[11px] text-blush-400 hover:underline"
                onClick={() => patch({ minRating: 0 })}
              >
                {t('browse.any')}
              </button>
            )}
          </div>

          <button
            className="ms-auto text-xs font-semibold text-gold-700 hover:underline"
            onClick={() => {
              setPage(1);
              setFilters(EMPTY);
            }}
          >
            {t('browse.clear')}
          </button>
        </div>
      </div>

      {/* Results */}
      <p className="mt-5 text-sm text-blush-500">
        {total} {t('browse.results')}
      </p>

      {isFetching && page === 1 ? (
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-sm text-blush-400">{t('browse.empty')}</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((o) => (
            <BrowseCard key={o.id} offering={o} locale={locale} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <GoldButton variant="outline" loading={isFetching} onClick={() => setPage((p) => p + 1)}>
            {t('browse.loadMore')}
          </GoldButton>
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
        active ? 'bg-gold-gradient text-white shadow' : 'bg-ivory-100 text-gold-700 hover:bg-gold-50'
      }`}
    >
      {children}
    </button>
  );
}

function BrowseCard({ offering, locale }: { offering: OfferingDTO; locale: Locale }) {
  const { t } = useTranslation();
  const meta = CATEGORY_META[offering.category];
  return (
    <div className="surface group flex flex-col overflow-hidden">
      {offering.imageUrls[0] ? (
        <img src={offering.imageUrls[0]} alt="" className="h-28 w-full object-cover" />
      ) : (
        <div
          className={`flex h-28 items-center justify-center bg-gradient-to-br ${meta.theme.gradientFrom} ${meta.theme.gradientTo} text-4xl`}
        >
          {offering.emoji}
        </div>
      )}
      <div className="flex flex-1 flex-col p-3.5">
        <span
          className={`mb-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.theme.badgeBg} ${meta.theme.badgeText}`}
        >
          {meta.emoji} {loc(meta.label, locale)}
        </span>
        <h3 className="font-display text-sm font-bold text-blush-900">{loc(offering.name, locale)}</h3>
        {offering.ratingCount > 0 && (
          <Stars value={offering.ratingAvg} count={offering.ratingCount} className="mt-1" />
        )}
        <p className="mt-1 line-clamp-2 text-[11px] text-blush-500">{loc(offering.description, locale)}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-sm font-bold text-gold-700">{money(offering.basePrice, locale)}</span>
          <Link to="/plan">
            <GoldButton size="sm">{t('nav.plan')}</GoldButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
