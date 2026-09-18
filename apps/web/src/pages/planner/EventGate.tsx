import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EventType } from '@hafalati/shared';
import { GoldButton } from '@/design/GoldButton';
import { OrnamentDivider } from '@/design/Ornament';
import { useWizard } from '@/store/wizard';

/** Per-event-type presentation for the joyful, color-coded picker cards. */
const EVENT_STYLE: Record<EventType, { emoji: string; ring: string; bg: string }> = {
  [EventType.WEDDING]: { emoji: '💍', ring: 'ring-rose-300', bg: 'from-rose-50 to-amber-50' },
  [EventType.ENGAGEMENT]: { emoji: '💐', ring: 'ring-pink-300', bg: 'from-pink-50 to-rose-50' },
  [EventType.BIRTHDAY]: { emoji: '🎂', ring: 'ring-amber-300', bg: 'from-amber-50 to-yellow-50' },
  [EventType.GRADUATION]: { emoji: '🎓', ring: 'ring-indigo-300', bg: 'from-indigo-50 to-sky-50' },
  [EventType.OTHER]: { emoji: '🎉', ring: 'ring-emerald-300', bg: 'from-emerald-50 to-teal-50' },
};

/**
 * The event-first hard gate: before browsing any category the customer must
 * pick what kind of event it is and when it takes place. Both are chosen here
 * and committed together, so the wizard only opens for a concrete date — which
 * is what lets each date-limited category show only what's free that day.
 */
export function EventGate() {
  const { t } = useTranslation();
  const { eventType, eventDate, setEventType, setEventDate } = useWizard();

  const [type, setType] = useState<EventType | ''>(eventType);
  const [date, setDate] = useState(eventDate);

  const today = new Date().toISOString().slice(0, 10);
  const canStart = Boolean(type) && Boolean(date);

  function start() {
    if (!canStart) return;
    setEventType(type as EventType);
    setEventDate(date);
  }

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <div className="mb-2 text-center">
        <span className="text-4xl">🗓️</span>
        <h2 className="mt-1 font-display text-2xl font-bold text-blush-900">{t('gate.title')}</h2>
        <p className="text-sm text-blush-500">{t('gate.subtitle')}</p>
      </div>
      <OrnamentDivider />

      {/* Step 1 — event type */}
      <div className="surface p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-700">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gold-gradient text-[11px] font-bold text-white">
            1
          </span>
          {t('gate.typeLabel')}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.values(EventType).map((et) => {
            const s = EVENT_STYLE[et];
            const active = type === et;
            return (
              <button
                key={et}
                onClick={() => setType(et)}
                title={t(`eventTypes.${et}`)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border bg-gradient-to-br p-4 transition-all hover:-translate-y-0.5 hover:shadow-gold ${
                  s.bg
                } ${
                  active
                    ? `border-transparent shadow-gold ring-2 ${s.ring}`
                    : 'border-gold-100'
                }`}
              >
                <span className="text-3xl">{s.emoji}</span>
                <span className="text-sm font-semibold text-blush-900">{t(`eventTypes.${et}`)}</span>
                {active && <span className="text-[11px] font-bold text-emerald-600">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — event date */}
      <div className="surface mt-4 p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-700">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gold-gradient text-[11px] font-bold text-white">
            2
          </span>
          {t('gate.dateLabel')}
        </p>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl border border-gold-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
        />
        <p className="mt-2 text-xs text-blush-400">{t('gate.dateHint')}</p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <GoldButton size="lg" onClick={start} disabled={!canStart}>
          {t('gate.start')} ✦
        </GoldButton>
        {!canStart && <p className="text-xs text-blush-400">{t('gate.pickBoth')}</p>}
      </div>
    </div>
  );
}
