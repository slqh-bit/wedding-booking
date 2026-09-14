import { useTranslation } from 'react-i18next';
import { CATEGORY_META_LIST, type Locale } from '@hafalati/shared';
import { useWizard } from '@/store/wizard';

/** Horizontal gold-fill progress stepper with step numbers + the summary node. */
export function Stepper() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { step, totalSteps, goto, selections } = useWizard();

  const nodes = [...CATEGORY_META_LIST.map((c) => ({ key: c.category, label: c.label[locale] })), {
    key: 'summary',
    label: t('wizard.summary'),
  }];
  const progress = (step / totalSteps) * 100;

  return (
    <div className="surface p-3 md:p-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-gold-700">
          {t('wizard.step')} {Math.min(step + 1, totalSteps + 1)} {t('wizard.of')} {totalSteps + 1}
        </span>
        <span className="text-xs font-medium text-blush-400">{Math.round(progress)}%</span>
      </div>

      <div className="relative">
        <div className="absolute end-0 start-0 top-4 -z-0 h-1 rounded-full bg-gold-100" />
        <div
          className="absolute end-0 top-4 -z-0 h-1 rounded-full bg-gold-gradient transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
        <div
          className="flex gap-1 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {nodes.map((n, i) => {
            const done = i < step;
            const active = i === step;
            const selected = n.key !== 'summary' && Boolean(selections[n.key as never]);
            return (
              <button
                key={n.key}
                onClick={() => goto(i)}
                className="z-10 flex min-w-[52px] flex-col items-center gap-1"
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold transition-all ${
                    active
                      ? 'bg-gold-gradient text-white shadow-gold ring-2 ring-gold-200'
                      : done || selected
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gold-100 text-gold-500'
                  }`}
                >
                  {i === totalSteps ? '✓' : done || selected ? '✓' : i + 1}
                </span>
                <span
                  className={`whitespace-nowrap text-[9px] font-medium ${
                    active ? 'text-gold-700' : 'text-blush-400'
                  }`}
                >
                  {n.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
