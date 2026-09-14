import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CATEGORY_META_LIST, type Locale } from '@hafalati/shared';
import { GoldButton } from '@/design/GoldButton';
import { OrnamentDivider } from '@/design/Ornament';
import { CrownIcon } from '@/design/Logo';

export function Home() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="relative overflow-hidden py-14 text-center md:py-20">
        <FloralCorner className="absolute -top-6 start-0 h-40 w-40 opacity-70" />
        <FloralCorner className="absolute -top-6 end-0 h-40 w-40 -scale-x-100 opacity-70" />
        <div className="animate-float mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-gold-gradient shadow-gold">
          <CrownIcon className="h-9 w-9 text-white" />
        </div>
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight text-blush-900 md:text-5xl">
          {t('home.heroTitlePre')}{' '}
          <span className="text-gold-foil">{t('home.heroTitleHi')}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-blush-600 md:text-base">
          {t('home.heroSubtitle')}
        </p>
        <div className="mt-8">
          <Link to="/plan">
            <GoldButton size="lg" className="animate-pop-in">
              {t('home.cta')} ✦
            </GoldButton>
          </Link>
        </div>
      </section>

      <OrnamentDivider>{t('home.servicesTitle')}</OrnamentDivider>

      {/* Services grid */}
      <section className="pb-6">
        <p className="mb-6 text-center text-sm text-blush-500">{t('home.servicesSubtitle')}</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {CATEGORY_META_LIST.map((c) => (
            <Link
              key={c.category}
              to="/plan"
              className="group surface flex flex-col items-center gap-1 p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-gold"
            >
              <span className="text-3xl transition-transform duration-300 group-hover:scale-110">
                {c.emoji}
              </span>
              <span className="text-xs font-semibold text-blush-800">{c.label[locale]}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 11 steps (mirrors the flier) */}
      <OrnamentDivider>{t('home.stepsTitle')}</OrnamentDivider>
      <section className="pb-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_META_LIST.map((c, idx) => (
            <div key={c.category} className="surface relative p-4">
              <span className="absolute -top-3 start-4 grid h-8 w-8 place-items-center rounded-full bg-gold-gradient text-sm font-bold text-white shadow">
                {idx + 1}
              </span>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-2xl">{c.emoji}</span>
                <h3 className="font-display text-lg font-bold text-blush-900">{c.label[locale]}</h3>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-blush-500">{c.subtitle[locale]}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/plan">
            <GoldButton size="lg">{t('home.cta')}</GoldButton>
          </Link>
        </div>
      </section>
    </div>
  );
}

function FloralCorner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden fill="none">
      <g stroke="#E5C76B" strokeWidth="1.5" opacity="0.9">
        <path d="M10 60 Q60 40 60 10" />
        <path d="M20 90 Q90 60 90 20" />
        <path d="M40 120 Q120 90 120 40" />
      </g>
      <g fill="#EFC2C4">
        <circle cx="60" cy="12" r="7" />
        <circle cx="92" cy="22" r="6" />
        <circle cx="122" cy="42" r="5" />
        <circle cx="16" cy="62" r="5" />
      </g>
      <g fill="#D9B24A">
        <circle cx="60" cy="12" r="2.5" />
        <circle cx="92" cy="22" r="2" />
      </g>
    </svg>
  );
}
