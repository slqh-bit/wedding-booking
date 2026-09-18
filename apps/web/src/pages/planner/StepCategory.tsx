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
import { CardGridSkeleton } from '@/design/Skeleton';
import { GoldButton } from '@/design/GoldButton';
import { OrnamentDivider } from '@/design/Ornament';
import { useWizard } from '@/store/wizard';
import { OfferingCard } from './OfferingCard';

/** One generic wizard step, driven entirely by `category`. Replaces the
 *  prototype's 11 near-identical hard-coded sections. */
export function StepCategory({ category }: { category: ServiceCategory }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const meta = CATEGORY_META[category];
  const { selections, select, clearSelection, next, goto, totalSteps, prev, step } = useWizard();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['offerings', category],
    queryFn: () => endpoints.offerings(category),
  });

  const selectedId = selections[category]?.id;

  /**
   * Tap-to-select with auto-advance:
   *  - tapping the already-selected card toggles it off (no advance);
   *  - a fresh pick (category had no selection) advances after a beat so the
   *    checkmark registers — and if that pick fills the LAST empty category,
   *    it skips straight to the Summary;
   *  - changing a pick on a category you returned to just updates it, no jump.
   */
  function onCardTap(offering: OfferingDTO) {
    if (selectedId === offering.id) {
      clearSelection(category);
      return;
    }
    const wasFresh = !selectedId;
    select(offering);
    if (!wasFresh) return;
    // After this pick, is every category chosen? (this one counts as picked)
    const allPicked = CATEGORY_ORDER.every((c) => c === category || Boolean(selections[c]));
    window.setTimeout(() => (allPicked ? goto(totalSteps) : next()), 260);
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-2 text-center">
        <span className="text-4xl">{meta.emoji}</span>
        <h2 className="mt-1 font-display text-2xl font-bold text-blush-900">{meta.title[locale]}</h2>
        <p className="text-sm text-blush-500">{meta.subtitle[locale]}</p>
      </div>
      <OrnamentDivider />

      {isLoading && <CardGridSkeleton />}

      {isError && (
        <div className="surface p-8 text-center">
          <p className="text-blush-600">{t('common.error')}</p>
          <GoldButton variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            {t('common.retry')}
          </GoldButton>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((o) => (
            <OfferingCard
              key={o.id}
              offering={o}
              selected={selectedId === o.id}
              onSelect={onCardTap}
            />
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <GoldButton variant="outline" onClick={prev} disabled={step === 0}>
          ← {t('wizard.prev')}
        </GoldButton>
        <span className="text-xs text-blush-400">
          {selectedId ? `✓ ${t('wizard.selected')} · ${t('wizard.tapToUnselect')}` : t('wizard.skipOptional')}
        </span>
        <GoldButton onClick={next}>{t('wizard.next')} →</GoldButton>
      </div>
    </div>
  );
}
