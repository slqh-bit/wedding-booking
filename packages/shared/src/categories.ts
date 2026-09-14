import { AvailabilityMode, CATEGORY_ORDER, ServiceCategory } from './enums.js';
import type { LocalizedString } from './i18n.js';

/**
 * Per-category presentation + behaviour metadata.
 * - `theme` values are Tailwind class fragments reused by the web card system
 *   (ported from the original prototype's per-service gradients/badges, but
 *   re-tuned to sit under the gold/blush brand).
 * - `availabilityMode` decides whether the booking engine locks a calendar date.
 */
export interface CategoryMeta {
  category: ServiceCategory;
  order: number;
  emoji: string;
  /** Short label used in the stepper. */
  label: LocalizedString;
  /** Wizard screen title. */
  title: LocalizedString;
  /** Wizard screen subtitle. */
  subtitle: LocalizedString;
  availabilityMode: AvailabilityMode;
  theme: {
    gradientFrom: string;
    gradientTo: string;
    badgeBg: string;
    badgeText: string;
    accent: string;
  };
  /** Key of the attribute shown as the card badge (e.g. capacity/style/type). */
  badgeAttr: string;
}

const DATE = AvailabilityMode.DATE_BOUND;
const PRODUCT = AvailabilityMode.PRODUCT;

export const CATEGORY_META: Record<ServiceCategory, CategoryMeta> = {
  HALL: {
    category: ServiceCategory.HALL,
    order: 1,
    emoji: '🏛️',
    label: { ar: 'القاعة', fr: 'Salle', en: 'Hall' },
    title: { ar: 'اختر القاعة المناسبة', fr: 'Choisissez la salle', en: 'Choose your hall' },
    subtitle: {
      ar: 'قاعات فاخرة تناسب جميع المناسبات',
      fr: 'Des salles élégantes pour toutes les occasions',
      en: 'Elegant halls for every occasion',
    },
    availabilityMode: DATE,
    theme: {
      gradientFrom: 'from-rose-100',
      gradientTo: 'to-amber-100',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
      accent: 'rose',
    },
    badgeAttr: 'capacity',
  },
  PHOTOGRAPHY: {
    category: ServiceCategory.PHOTOGRAPHY,
    order: 2,
    emoji: '📸',
    label: { ar: 'المصوّر', fr: 'Photographe', en: 'Photographer' },
    title: { ar: 'اختر المصوّر', fr: 'Choisissez le photographe', en: 'Choose your photographer' },
    subtitle: {
      ar: 'أفضل المصوّرين لتوثيق لحظاتك',
      fr: 'Les meilleurs pour immortaliser vos instants',
      en: 'The best to capture your moments',
    },
    availabilityMode: DATE,
    theme: {
      gradientFrom: 'from-sky-50',
      gradientTo: 'to-indigo-100',
      badgeBg: 'bg-sky-50',
      badgeText: 'text-sky-700',
      accent: 'sky',
    },
    badgeAttr: 'style',
  },
  DECOR: {
    category: ServiceCategory.DECOR,
    order: 3,
    emoji: '🌸',
    label: { ar: 'الديكور', fr: 'Décoration', en: 'Decor' },
    title: { ar: 'اختر الديكور', fr: 'Choisissez la décoration', en: 'Choose your decor' },
    subtitle: {
      ar: 'تصاميم مميّزة تعكس ذوقك',
      fr: 'Des designs qui reflètent votre goût',
      en: 'Designs that reflect your taste',
    },
    availabilityMode: DATE,
    theme: {
      gradientFrom: 'from-pink-50',
      gradientTo: 'to-rose-100',
      badgeBg: 'bg-pink-50',
      badgeText: 'text-pink-700',
      accent: 'pink',
    },
    badgeAttr: 'theme',
  },
  BEAUTY: {
    category: ServiceCategory.BEAUTY,
    order: 4,
    emoji: '💄',
    label: { ar: 'التجميل', fr: 'Beauté', en: 'Beauty' },
    title: {
      ar: 'خدمات الحلاقة والتجميل',
      fr: 'Coiffure & maquillage',
      en: 'Hair & makeup services',
    },
    subtitle: {
      ar: 'إطلالة مثالية في يومك الخاص',
      fr: 'Un look parfait pour votre jour spécial',
      en: 'A perfect look for your special day',
    },
    availabilityMode: DATE,
    theme: {
      gradientFrom: 'from-amber-50',
      gradientTo: 'to-orange-100',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-700',
      accent: 'amber',
    },
    badgeAttr: 'includes',
  },
  DRESS: {
    category: ServiceCategory.DRESS,
    order: 5,
    emoji: '👗',
    label: { ar: 'الفساتين', fr: 'Robes', en: 'Dresses' },
    title: { ar: 'اختر الفستان', fr: 'Choisissez la robe', en: 'Choose your dress' },
    subtitle: {
      ar: 'فساتين أنيقة تعكس شخصيتك',
      fr: 'Des robes élégantes à votre image',
      en: 'Elegant dresses that reflect you',
    },
    availabilityMode: PRODUCT,
    theme: {
      gradientFrom: 'from-violet-50',
      gradientTo: 'to-purple-100',
      badgeBg: 'bg-violet-50',
      badgeText: 'text-violet-700',
      accent: 'violet',
    },
    badgeAttr: 'style',
  },
  MUSIC: {
    category: ServiceCategory.MUSIC,
    order: 6,
    emoji: '🎵',
    label: { ar: 'الموسيقى', fr: 'Musique', en: 'Music' },
    title: { ar: 'احجز خدمة الموسيقى', fr: 'Réservez la musique', en: 'Book your music' },
    subtitle: {
      ar: 'دي جي، فرقة حية أو موسيقى كلاسيكية',
      fr: 'DJ, groupe live ou musique classique',
      en: 'DJ, live band or classical music',
    },
    availabilityMode: DATE,
    theme: {
      gradientFrom: 'from-emerald-50',
      gradientTo: 'to-teal-100',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      accent: 'emerald',
    },
    badgeAttr: 'type',
  },
  CATERING: {
    category: ServiceCategory.CATERING,
    order: 7,
    emoji: '🍽️',
    label: { ar: 'الضيافة', fr: 'Traiteur', en: 'Catering' },
    title: { ar: 'اختر خدمة الضيافة', fr: 'Choisissez le traiteur', en: 'Choose your catering' },
    subtitle: {
      ar: 'بوفيه مفتوح، عشاء رسمي أو ضيافة خفيفة',
      fr: 'Buffet, dîner ou réception légère',
      en: 'Buffet, formal dinner or light reception',
    },
    availabilityMode: DATE,
    theme: {
      gradientFrom: 'from-orange-50',
      gradientTo: 'to-red-100',
      badgeBg: 'bg-orange-50',
      badgeText: 'text-orange-700',
      accent: 'orange',
    },
    badgeAttr: 'type',
  },
  CAKE: {
    category: ServiceCategory.CAKE,
    order: 8,
    emoji: '🎂',
    label: { ar: 'الكيك', fr: 'Gâteau', en: 'Cake' },
    title: { ar: 'الكيك والحلويات', fr: 'Gâteau & douceurs', en: 'Cake & sweets' },
    subtitle: {
      ar: 'كيك مناسبات وحلويات شرقية وغربية',
      fr: 'Gâteaux et douceurs orientales & occidentales',
      en: 'Celebration cakes and sweets',
    },
    availabilityMode: PRODUCT,
    theme: {
      gradientFrom: 'from-yellow-50',
      gradientTo: 'to-pink-100',
      badgeBg: 'bg-pink-50',
      badgeText: 'text-pink-700',
      accent: 'pink',
    },
    badgeAttr: 'type',
  },
  FLOWERS: {
    category: ServiceCategory.FLOWERS,
    order: 9,
    emoji: '💐',
    label: { ar: 'الزهور', fr: 'Fleurs', en: 'Flowers' },
    title: { ar: 'اختر باقات الزهور', fr: 'Choisissez les fleurs', en: 'Choose your flowers' },
    subtitle: {
      ar: 'تنسيق زهور للمناسبة والطاولات والعروس',
      fr: 'Fleurs pour la salle, les tables et la mariée',
      en: 'Flowers for the venue, tables and bride',
    },
    availabilityMode: PRODUCT,
    theme: {
      gradientFrom: 'from-green-50',
      gradientTo: 'to-lime-100',
      badgeBg: 'bg-green-50',
      badgeText: 'text-green-700',
      accent: 'green',
    },
    badgeAttr: 'type',
  },
  INVITATIONS: {
    category: ServiceCategory.INVITATIONS,
    order: 10,
    emoji: '✉️',
    label: { ar: 'الدعوات', fr: 'Invitations', en: 'Invitations' },
    title: { ar: 'اختر الدعوات', fr: 'Choisissez les invitations', en: 'Choose your invitations' },
    subtitle: {
      ar: 'دعوات ورقية، إلكترونية أو فاخرة',
      fr: 'Invitations papier, électroniques ou luxe',
      en: 'Paper, digital or luxury invitations',
    },
    availabilityMode: PRODUCT,
    theme: {
      gradientFrom: 'from-cyan-50',
      gradientTo: 'to-sky-100',
      badgeBg: 'bg-cyan-50',
      badgeText: 'text-cyan-700',
      accent: 'cyan',
    },
    badgeAttr: 'type',
  },
  TRANSPORT: {
    category: ServiceCategory.TRANSPORT,
    order: 11,
    emoji: '🚗',
    label: { ar: 'النقل', fr: 'Transport', en: 'Transport' },
    title: { ar: 'اختر خدمة النقل', fr: 'Choisissez le transport', en: 'Choose your transport' },
    subtitle: {
      ar: 'سيارات فاخرة، حافلات أو نقل الضيوف',
      fr: 'Voitures de luxe, bus ou navette invités',
      en: 'Luxury cars, buses or guest shuttles',
    },
    availabilityMode: DATE,
    theme: {
      gradientFrom: 'from-slate-50',
      gradientTo: 'to-gray-200',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-700',
      accent: 'slate',
    },
    badgeAttr: 'type',
  },
};

export const CATEGORY_META_LIST: CategoryMeta[] = CATEGORY_ORDER.map((c) => CATEGORY_META[c]);

export function isDateBound(category: ServiceCategory): boolean {
  return CATEGORY_META[category].availabilityMode === AvailabilityMode.DATE_BOUND;
}
