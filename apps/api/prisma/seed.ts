/**
 * Seed: ports the original prototype's 11-category catalog into real
 * ServiceOffering rows — converted to TND, trilingual (ar/fr/en) — plus a
 * platform-owned vendor, an admin + demo customer, and forward availability
 * for date-bound categories.
 *
 * Run: pnpm --filter @hafalati/api prisma:seed
 */
import { PrismaClient, Prisma } from '@prisma/client';
import argon2 from 'argon2';
import {
  AvailabilityMode,
  CATEGORY_META,
  CATEGORY_ORDER,
  ServiceCategory,
  isDateBound,
  type LocalizedString,
} from '@hafalati/shared';

const prisma = new PrismaClient();

interface SeedOffering {
  name: LocalizedString;
  description: LocalizedString;
  price: number; // TND
  emoji: string;
  attributes: Record<string, unknown>;
}

// prettier-ignore
const CATALOG: Record<ServiceCategory, SeedOffering[]> = {
  HALL: [
    { emoji: '🏛️', price: 4500, attributes: { capacity: 300 }, name: { ar: 'قاعة الأحلام', fr: 'Salle des Rêves', en: 'Dream Hall' }, description: { ar: 'قاعة فاخرة بديكور كلاسيكي', fr: 'Salle luxueuse au décor classique', en: 'Luxurious hall with classic decor' } },
    { emoji: '✨', price: 2700, attributes: { capacity: 150 }, name: { ar: 'قاعة النور', fr: 'Salle Nour', en: 'Nour Hall' }, description: { ar: 'تصميم عصري وإضاءة مميّزة', fr: 'Design moderne et éclairage soigné', en: 'Modern design and refined lighting' } },
    { emoji: '🌹', price: 6600, attributes: { capacity: 500 }, name: { ar: 'قاعة الورود', fr: 'Salle des Roses', en: 'Roses Hall' }, description: { ar: 'مساحة واسعة وحديقة خارجية', fr: 'Grand espace avec jardin extérieur', en: 'Spacious venue with outdoor garden' } },
    { emoji: '🏰', price: 3600, attributes: { capacity: 200 }, name: { ar: 'قاعة القصر', fr: 'Salle du Palais', en: 'Palace Hall' }, description: { ar: 'أجواء ملكية راقية', fr: 'Ambiance royale et raffinée', en: 'Refined royal atmosphere' } },
    { emoji: '☁️', price: 2100, attributes: { capacity: 100 }, name: { ar: 'قاعة السماء', fr: 'Salle du Ciel', en: 'Sky Hall' }, description: { ar: 'مناسبة للحفلات الصغيرة', fr: 'Idéale pour les petites fêtes', en: 'Perfect for small celebrations' } },
    { emoji: '🥇', price: 5400, attributes: { capacity: 400 }, name: { ar: 'قاعة الذهب', fr: 'Salle d’Or', en: 'Gold Hall' }, description: { ar: 'فخامة لا مثيل لها', fr: 'Un luxe incomparable', en: 'Unmatched luxury' } },
  ],
  PHOTOGRAPHY: [
    { emoji: '📷', price: 1200, attributes: { style: 'كلاسيكي + عصري' }, name: { ar: 'استوديو الرؤية', fr: 'Studio Vision', en: 'Vision Studio' }, description: { ar: 'خبرة أكثر من 10 سنوات', fr: 'Plus de 10 ans d’expérience', en: 'Over 10 years of experience' } },
    { emoji: '🎥', price: 950, attributes: { style: 'تصوير طبيعي' }, name: { ar: 'عدسة السعادة', fr: 'Lentille du Bonheur', en: 'Happy Lens' }, description: { ar: 'فيديو + صور عالية الجودة', fr: 'Vidéo + photos haute qualité', en: 'HD video + photos' } },
    { emoji: '🎨', price: 1450, attributes: { style: 'فني وإبداعي' }, name: { ar: 'لمسة فن', fr: 'Touche d’Art', en: 'Art Touch' }, description: { ar: 'أسلوب فني مميّز', fr: 'Un style artistique unique', en: 'A distinctive artistic style' } },
    { emoji: '🖼️', price: 1050, attributes: { style: 'تقليدي وحديث' }, name: { ar: 'ذكرى للأبد', fr: 'Souvenir Éternel', en: 'Forever Memory' }, description: { ar: 'باقات مرنة', fr: 'Formules flexibles', en: 'Flexible packages' } },
  ],
  DECOR: [
    { emoji: '🤍', price: 1500, attributes: { theme: 'كلاسيكي' }, name: { ar: 'الورود البيضاء', fr: 'Roses Blanches', en: 'White Roses' }, description: { ar: 'ورود بيضاء وإضاءة ناعمة', fr: 'Roses blanches et éclairage doux', en: 'White roses and soft lighting' } },
    { emoji: '🌷', price: 1350, attributes: { theme: 'ملوّن' }, name: { ar: 'باقة الربيع', fr: 'Bouquet Printemps', en: 'Spring Bouquet' }, description: { ar: 'ألوان زاهية وأزهار طبيعية', fr: 'Couleurs vives et fleurs naturelles', en: 'Bright colors and natural flowers' } },
    { emoji: '✨', price: 2400, attributes: { theme: 'فاخر' }, name: { ar: 'الذهب الملكي', fr: 'Or Royal', en: 'Royal Gold' }, description: { ar: 'تفاصيل ذهبية فاخرة', fr: 'Détails dorés luxueux', en: 'Luxurious gold details' } },
    { emoji: '🌿', price: 950, attributes: { theme: 'بسيط' }, name: { ar: 'الحد الأدنى', fr: 'Minimaliste', en: 'Minimal' }, description: { ar: 'تصميم أنيق وبسيط', fr: 'Design élégant et épuré', en: 'Elegant, minimal design' } },
    { emoji: '⭐', price: 1800, attributes: { theme: 'ليلي' }, name: { ar: 'باقة النجوم', fr: 'Bouquet Étoilé', en: 'Starry Theme' }, description: { ar: 'إضاءة نجوم وسماء', fr: 'Éclairage étoilé', en: 'Starlight ambiance' } },
  ],
  BEAUTY: [
    { emoji: '👰', price: 750, attributes: { includes: 'شعر + مكياج + أظافر' }, name: { ar: 'باقة العروس الكاملة', fr: 'Forfait Mariée Complet', en: 'Complete Bride Package' }, description: { ar: 'جلسة كاملة للعروس', fr: 'Séance complète pour la mariée', en: 'Full session for the bride' } },
    { emoji: '💄', price: 360, attributes: { includes: 'شعر + مكياج' }, name: { ar: 'باقة الصديقات', fr: 'Forfait Amies', en: 'Friends Package' }, description: { ar: 'للصديقات والمرافقات', fr: 'Pour les amies et accompagnantes', en: 'For friends and companions' } },
    { emoji: '💈', price: 120, attributes: { includes: 'حلاقة + تهذيب' }, name: { ar: 'باقة العريس', fr: 'Forfait Marié', en: 'Groom Package' }, description: { ar: 'إطلالة أنيقة للعريس', fr: 'Un look élégant pour le marié', en: 'An elegant look for the groom' } },
    { emoji: '👑', price: 1150, attributes: { includes: 'كل شيء + مساج' }, name: { ar: 'باقة VIP', fr: 'Forfait VIP', en: 'VIP Package' }, description: { ar: 'تجربة فاخرة كاملة', fr: 'Une expérience de luxe complète', en: 'A complete luxury experience' } },
  ],
  DRESS: [
    { emoji: '👗', price: 1350, attributes: { style: 'كلاسيكي' }, name: { ar: 'فستان الأميرة', fr: 'Robe Princesse', en: 'Princess Dress' }, description: { ar: 'تطريز يدوي فاخر', fr: 'Broderie à la main luxueuse', en: 'Luxurious hand embroidery' } },
    { emoji: '✨', price: 1150, attributes: { style: 'عصري' }, name: { ar: 'فستان الحداثة', fr: 'Robe Moderne', en: 'Modern Dress' }, description: { ar: 'قصّة حديثة وأنيقة', fr: 'Coupe moderne et élégante', en: 'Modern, elegant cut' } },
    { emoji: '🌸', price: 950, attributes: { style: 'رومانسي' }, name: { ar: 'فستان الورود', fr: 'Robe Fleurie', en: 'Floral Dress' }, description: { ar: 'تفاصيل ورود ناعمة', fr: 'Détails floraux délicats', en: 'Delicate floral details' } },
    { emoji: '🦢', price: 850, attributes: { style: 'خفيف' }, name: { ar: 'فستان الشيفون', fr: 'Robe Mousseline', en: 'Chiffon Dress' }, description: { ar: 'خامة شيفون فاخرة', fr: 'Mousseline de qualité', en: 'Premium chiffon fabric' } },
    { emoji: '💎', price: 1500, attributes: { style: 'سهرة' }, name: { ar: 'فستان السهرة', fr: 'Robe de Soirée', en: 'Evening Gown' }, description: { ar: 'مثالي للحفلات المسائية', fr: 'Idéale pour les soirées', en: 'Perfect for evening events' } },
  ],
  MUSIC: [
    { emoji: '🎧', price: 750, attributes: { type: 'دي جي' }, name: { ar: 'دي جي محترف', fr: 'DJ Professionnel', en: 'Professional DJ' }, description: { ar: 'أغاني حديثة + إضاءة', fr: 'Musiques modernes + éclairage', en: 'Modern tracks + lighting' } },
    { emoji: '🎸', price: 1800, attributes: { type: 'فرقة حية' }, name: { ar: 'فرقة موسيقية حية', fr: 'Groupe Live', en: 'Live Band' }, description: { ar: 'عزف حي مع مطرب', fr: 'Musique live avec chanteur', en: 'Live music with a singer' } },
    { emoji: '🥁', price: 1350, attributes: { type: 'تراث' }, name: { ar: 'فرقة تراثية', fr: 'Groupe Traditionnel', en: 'Folk Band' }, description: { ar: 'موسيقى شعبية وتونسية', fr: 'Musique populaire tunisienne', en: 'Tunisian folk music' } },
    { emoji: '🎻', price: 1150, attributes: { type: 'كلاسيكي' }, name: { ar: 'موسيقى كلاسيكية', fr: 'Musique Classique', en: 'Classical Music' }, description: { ar: 'أوركسترا أو عازف بيانو', fr: 'Orchestre ou pianiste', en: 'Orchestra or pianist' } },
    { emoji: '🔊', price: 360, attributes: { type: 'صوتيات' }, name: { ar: 'نظام صوت', fr: 'Système Son', en: 'Sound System' }, description: { ar: 'نظام صوت احترافي', fr: 'Système de son professionnel', en: 'Professional sound system' } },
  ],
  CATERING: [
    { emoji: '🍽️', price: 5400, attributes: { type: 'بوفيه' }, name: { ar: 'بوفيه مفتوح فاخر', fr: 'Buffet Ouvert Luxe', en: 'Luxury Open Buffet' }, description: { ar: 'أكثر من 40 صنف + مشروبات', fr: 'Plus de 40 plats + boissons', en: '40+ dishes + drinks' } },
    { emoji: '🦞', price: 6600, attributes: { type: 'عشاء رسمي' }, name: { ar: 'عشاء رسمي', fr: 'Dîner Servi', en: 'Formal Dinner' }, description: { ar: 'قائمة راقية لكل ضيف', fr: 'Menu raffiné par invité', en: 'Refined per-guest menu' } },
    { emoji: '🥪', price: 1950, attributes: { type: 'خفيف' }, name: { ar: 'ضيافة خفيفة', fr: 'Réception Légère', en: 'Light Reception' }, description: { ar: 'كانابيه ومعجّنات', fr: 'Canapés et viennoiseries', en: 'Canapés and pastries' } },
    { emoji: '🍛', price: 4200, attributes: { type: 'تونسي' }, name: { ar: 'بوفيه تونسي', fr: 'Buffet Tunisien', en: 'Tunisian Buffet' }, description: { ar: 'مأكولات تونسية أصيلة', fr: 'Cuisine tunisienne authentique', en: 'Authentic Tunisian cuisine' } },
    { emoji: '☕', price: 1200, attributes: { type: 'خدمة' }, name: { ar: 'خدمة الضيافة', fr: 'Service Boissons', en: 'Beverage Service' }, description: { ar: 'قهوة، شاي ومشروبات', fr: 'Café, thé et boissons', en: 'Coffee, tea and drinks' } },
  ],
  CAKE: [
    { emoji: '👰', price: 850, attributes: { type: 'زفاف' }, name: { ar: 'كيك الزفاف الفاخر', fr: 'Gâteau de Mariage', en: 'Luxury Wedding Cake' }, description: { ar: '3-5 طوابق مع تزيين يدوي', fr: '3 à 5 étages décorés main', en: '3–5 tiers, hand-decorated' } },
    { emoji: '🎂', price: 270, attributes: { type: 'عيد ميلاد' }, name: { ar: 'كيك عيد ميلاد', fr: 'Gâteau d’Anniversaire', en: 'Birthday Cake' }, description: { ar: 'تصميم حسب الطلب', fr: 'Design personnalisé', en: 'Custom design' } },
    { emoji: '🧁', price: 1350, attributes: { type: 'حلويات' }, name: { ar: 'طاولة حلويات', fr: 'Table de Douceurs', en: 'Dessert Table' }, description: { ar: 'كيك + كب كيك + ماكرون', fr: 'Gâteau + cupcakes + macarons', en: 'Cake + cupcakes + macarons' } },
    { emoji: '🍪', price: 650, attributes: { type: 'شرقي' }, name: { ar: 'حلويات تونسية', fr: 'Douceurs Tunisiennes', en: 'Tunisian Sweets' }, description: { ar: 'بقلاوة، مقروض وكعك', fr: 'Baklava, makroudh et kaak', en: 'Baklava, makroudh and kaak' } },
    { emoji: '🥮', price: 195, attributes: { type: 'صغير' }, name: { ar: 'كيك صغير أنيق', fr: 'Petit Gâteau', en: 'Elegant Small Cake' }, description: { ar: 'مناسب للحفلات الصغيرة', fr: 'Idéal pour petites fêtes', en: 'Great for small parties' } },
  ],
  FLOWERS: [
    { emoji: '💐', price: 540, attributes: { type: 'عروس' }, name: { ar: 'باقة العروس', fr: 'Bouquet de la Mariée', en: 'Bridal Bouquet' }, description: { ar: 'ورود طبيعية بتنسيق فاخر', fr: 'Fleurs naturelles élégantes', en: 'Elegant natural flowers' } },
    { emoji: '🌺', price: 1350, attributes: { type: 'طاولات' }, name: { ar: 'تنسيق الطاولات', fr: 'Décor de Tables', en: 'Table Arrangements' }, description: { ar: 'زهور لكل طاولة + مدخل', fr: 'Fleurs par table + entrée', en: 'Flowers per table + entrance' } },
    { emoji: '🤍', price: 650, attributes: { type: 'كلاسيكي' }, name: { ar: 'باقة بيضاء كلاسيكية', fr: 'Bouquet Blanc Classique', en: 'Classic White Bouquet' }, description: { ar: 'ورود بيضاء موسمية', fr: 'Roses blanches de saison', en: 'Seasonal white roses' } },
    { emoji: '🌷', price: 850, attributes: { type: 'ملوّن' }, name: { ar: 'تنسيق ربيعي ملوّن', fr: 'Arrangement Printanier', en: 'Colorful Spring' }, description: { ar: 'ألوان زاهية متنوّعة', fr: 'Couleurs vives variées', en: 'Bright, varied colors' } },
    { emoji: '🌿', price: 360, attributes: { type: 'صناعي' }, name: { ar: 'زهور صناعية أنيقة', fr: 'Fleurs Artificielles', en: 'Elegant Faux Flowers' }, description: { ar: 'خيار اقتصادي يدوم', fr: 'Option économique durable', en: 'Long-lasting budget option' } },
  ],
  INVITATIONS: [
    { emoji: '✉️', price: 450, attributes: { type: 'ورقي' }, name: { ar: 'دعوات ورقية فاخرة', fr: 'Invitations Papier Luxe', en: 'Luxury Paper Invites' }, description: { ar: 'طباعة عالية + أظرف (100)', fr: 'Impression + enveloppes (100)', en: 'HD print + envelopes (100)' } },
    { emoji: '📱', price: 120, attributes: { type: 'إلكتروني' }, name: { ar: 'دعوات إلكترونية', fr: 'Invitations Digitales', en: 'Digital Invites' }, description: { ar: 'تصميم + إرسال واتساب', fr: 'Design + envoi WhatsApp', en: 'Design + WhatsApp delivery' } },
    { emoji: '✨', price: 850, attributes: { type: 'فاخر' }, name: { ar: 'دعوات ذهبية', fr: 'Invitations Dorées', en: 'Gold Invites' }, description: { ar: 'ورق سميك وطباعة ذهبية', fr: 'Papier épais, dorure', en: 'Thick paper, gold foil' } },
    { emoji: '🎬', price: 240, attributes: { type: 'فيديو' }, name: { ar: 'دعوة فيديو', fr: 'Invitation Vidéo', en: 'Video Invite' }, description: { ar: 'فيديو دعوة متحرّك', fr: 'Vidéo d’invitation animée', en: 'Animated invitation video' } },
  ],
  TRANSPORT: [
    { emoji: '🚘', price: 750, attributes: { type: 'عروس' }, name: { ar: 'سيارة العروس الفاخرة', fr: 'Voiture des Mariés', en: 'Luxury Bridal Car' }, description: { ar: 'سيارة فاخرة مع سائق', fr: 'Voiture de luxe avec chauffeur', en: 'Luxury car with driver' } },
    { emoji: '🚌', price: 540, attributes: { type: 'حافلة' }, name: { ar: 'حافلة نقل الضيوف', fr: 'Bus des Invités', en: 'Guest Bus' }, description: { ar: 'حافلة مكيّفة لـ 50 راكب', fr: 'Bus climatisé 50 places', en: 'A/C bus for 50 guests' } },
    { emoji: '🚗', price: 1350, attributes: { type: 'أسطول' }, name: { ar: 'أسطول سيارات', fr: 'Flotte de Voitures', en: 'Car Fleet' }, description: { ar: '5 سيارات فاخرة للعائلة', fr: '5 voitures pour la famille', en: '5 cars for the family' } },
    { emoji: '🚙', price: 950, attributes: { type: 'ليموزين' }, name: { ar: 'ليموزين طويلة', fr: 'Limousine', en: 'Stretch Limousine' }, description: { ar: 'ليموزين فاخرة للعروسين', fr: 'Limousine pour les mariés', en: 'Limo for the couple' } },
    { emoji: '🏎️', price: 270, attributes: { type: 'فردي' }, name: { ar: 'سيارة واحدة', fr: 'Voiture Simple', en: 'Single Car' }, description: { ar: 'سيارة فاخرة لساعات محدّدة', fr: 'Voiture de luxe à l’heure', en: 'Luxury car, hourly' } },
  ],
};

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  console.log('🌱 Seeding حفلاتي…');

  // ── Reset (idempotent seed) ─────────────────────────────
  await prisma.availability.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.package.deleteMany();
  await prisma.serviceOffering.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  // Per-category settings (kept across re-seeds so admin toggles survive).
  for (const category of CATEGORY_ORDER) {
    await prisma.categoryConfig.upsert({
      where: { category },
      update: {},
      create: { category, dateLimited: isDateBound(category) },
    });
  }

  // ── Users ───────────────────────────────────────────────
  const adminPassword = await argon2.hash('Admin1234');
  const customerPassword = await argon2.hash('Customer1234');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@hafalati.tn',
      phone: '+21697580081',
      passwordHash: adminPassword,
      fullName: 'مدير حفلاتي',
      role: 'ADMIN',
      locale: 'ar',
    },
  });

  const client = await prisma.user.create({
    data: {
      email: 'client@hafalati.tn',
      phone: '+21620000000',
      passwordHash: customerPassword,
      fullName: 'عميل تجريبي',
      role: 'CUSTOMER',
      locale: 'ar',
    },
  });

  // ── Platform vendor (owns all MVP offerings) ────────────
  const vendor = await prisma.vendor.create({
    data: {
      name: 'حفلاتي',
      description: 'منصّة تنظيم الحفلات والمناسبات',
      phone: '+21697580081',
      isPlatformOwned: true,
      status: 'APPROVED',
    },
  });

  // ── Offerings + availability ────────────────────────────
  const today = new Date();
  const startOfToday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const AVAILABILITY_DAYS = 120;

  let offeringCount = 0;
  for (const category of Object.keys(CATALOG) as ServiceCategory[]) {
    for (const item of CATALOG[category]) {
      const offering = await prisma.serviceOffering.create({
        data: {
          vendorId: vendor.id,
          category,
          name: item.name as unknown as Prisma.InputJsonValue,
          description: item.description as unknown as Prisma.InputJsonValue,
          basePrice: new Prisma.Decimal(item.price),
          emoji: item.emoji,
          attributes: item.attributes as Prisma.InputJsonValue,
          imageUrls: [],
          isActive: true,
          moderationStatus: 'APPROVED',
        },
      });
      offeringCount += 1;

      if (isDateBound(category)) {
        const rows = Array.from({ length: AVAILABILITY_DAYS }, (_, i) => ({
          offeringId: offering.id,
          date: addDays(startOfToday, i + 1),
          status: 'AVAILABLE' as const,
        }));
        await prisma.availability.createMany({ data: rows });
      }
    }
  }

  // ── Demo marketplace vendors (Phase 3) ──────────────────
  const vendorPassword = await argon2.hash('Vendor1234');

  async function makeVendor(opts: {
    email: string;
    fullName: string;
    phone: string;
    vendorName: string;
    description: string;
    city: string;
    status: 'PENDING' | 'APPROVED';
    offerings: { category: ServiceCategory; item: SeedOffering; moderation: 'PENDING' | 'APPROVED' }[];
  }) {
    const user = await prisma.user.create({
      data: {
        email: opts.email,
        phone: opts.phone,
        passwordHash: vendorPassword,
        fullName: opts.fullName,
        role: 'VENDOR',
        locale: 'ar',
      },
    });
    const v = await prisma.vendor.create({
      data: {
        userId: user.id,
        name: opts.vendorName,
        description: opts.description,
        phone: opts.phone,
        email: opts.email,
        city: opts.city,
        status: opts.status,
      },
    });
    for (const o of opts.offerings) {
      const off = await prisma.serviceOffering.create({
        data: {
          vendorId: v.id,
          category: o.category,
          name: o.item.name as unknown as Prisma.InputJsonValue,
          description: o.item.description as unknown as Prisma.InputJsonValue,
          basePrice: new Prisma.Decimal(o.item.price),
          emoji: o.item.emoji,
          attributes: o.item.attributes as Prisma.InputJsonValue,
          isActive: true,
          moderationStatus: o.moderation,
        },
      });
      if (isDateBound(o.category) && o.moderation === 'APPROVED') {
        await prisma.availability.createMany({
          data: Array.from({ length: AVAILABILITY_DAYS }, (_, i) => ({
            offeringId: off.id,
            date: addDays(startOfToday, i + 1),
            status: 'AVAILABLE' as const,
          })),
        });
      }
    }
  }

  await makeVendor({
    email: 'vendor@hafalati.tn',
    fullName: 'استوديو الأناقة',
    phone: '+21650000001',
    vendorName: 'استوديو الأناقة للتصوير',
    description: 'تصوير احترافي للأعراس والمناسبات',
    city: 'القصرين',
    status: 'APPROVED',
    offerings: [
      {
        category: ServiceCategory.PHOTOGRAPHY,
        moderation: 'APPROVED',
        item: { emoji: '📷', price: 1400, attributes: { style: 'سينمائي' }, name: { ar: 'باقة سينمائية', fr: 'Pack Cinéma', en: 'Cinematic Pack' }, description: { ar: 'فيديو سينمائي + صور', fr: 'Vidéo cinéma + photos', en: 'Cinematic video + photos' } },
      },
      {
        category: ServiceCategory.BEAUTY,
        moderation: 'APPROVED',
        item: { emoji: '💄', price: 900, attributes: { includes: 'شعر + مكياج' }, name: { ar: 'مكياج عروس فاخر', fr: 'Maquillage Mariée', en: 'Bridal Makeup' }, description: { ar: 'إطلالة عروس متكاملة', fr: 'Look mariée complet', en: 'Complete bridal look' } },
      },
    ],
  });

  await makeVendor({
    email: 'vendor2@hafalati.tn',
    fullName: 'لمسات فاخرة',
    phone: '+21650000002',
    vendorName: 'لمسات فاخرة للديكور',
    description: 'ديكورات وتنسيق قاعات',
    city: 'سبيطلة',
    status: 'PENDING',
    offerings: [
      {
        category: ServiceCategory.DECOR,
        moderation: 'PENDING',
        item: { emoji: '✨', price: 2600, attributes: { theme: 'فاخر' }, name: { ar: 'ديكور ملكي', fr: 'Décor Royal', en: 'Royal Decor' }, description: { ar: 'تصميم فخم بإضاءة', fr: 'Design luxueux avec éclairage', en: 'Luxurious lit design' } },
      },
    ],
  });

  // ── Demo reviews (Phase 3 slice 3) ──────────────────────
  // A COMPLETED booking unlocks the client's reviews so stars show at once.
  const hall = await prisma.serviceOffering.findFirst({
    where: { category: 'HALL', vendor: { isPlatformOwned: true } },
    orderBy: { basePrice: 'asc' },
  });
  const photo = await prisma.serviceOffering.findFirst({
    where: { category: 'PHOTOGRAPHY', vendor: { email: 'vendor@hafalati.tn' } },
  });
  const reviewables = [hall, photo].filter((o): o is NonNullable<typeof o> => o !== null);

  if (reviewables.length > 0) {
    const round3 = (n: number) => Math.round(n * 1000) / 1000;
    const subtotal = round3(reviewables.reduce((s, o) => s + Number(o.basePrice), 0));
    const tva = round3(subtotal * 0.19);
    const timbre = 1;
    const total = round3(subtotal + tva + timbre);
    const booking = await prisma.booking.create({
      data: {
        reference: 'HF-DEMO01',
        userId: client.id,
        eventDate: addDays(startOfToday, -30), // a past, completed event
        eventType: 'WEDDING',
        status: 'COMPLETED',
        subtotal: new Prisma.Decimal(subtotal),
        tva: new Prisma.Decimal(tva),
        timbreFiscal: new Prisma.Decimal(timbre),
        total: new Prisma.Decimal(total),
        depositAmount: new Prisma.Decimal(round3(total * 0.3)),
        depositStatus: 'PAID',
        items: {
          create: reviewables.map((o) => ({
            offeringId: o.id,
            category: o.category,
            unitPrice: o.basePrice,
            snapshot: o.name as Prisma.InputJsonValue,
          })),
        },
      },
    });

    const notes: Record<string, { rating: number; comment: string }> = {
      HALL: { rating: 5, comment: 'قاعة رائعة وخدمة ممتازة، شكراً حفلاتي!' },
      PHOTOGRAPHY: { rating: 4, comment: 'تصوير احترافي، الصور خيالية.' },
    };
    for (const o of reviewables) {
      const n = notes[o.category] ?? { rating: 5, comment: 'ممتاز' };
      await prisma.review.create({
        data: {
          userId: client.id,
          offeringId: o.id,
          bookingId: booking.id,
          rating: n.rating,
          comment: n.comment,
          status: 'PUBLISHED',
        },
      });
    }
  }

  // ── Curated promo packages (Phase 3 slice 5) ────────────
  async function platformOffering(category: ServiceCategory) {
    return prisma.serviceOffering.findFirst({
      where: { category, vendor: { isPlatformOwned: true } },
      orderBy: { basePrice: 'asc' },
    });
  }

  async function makePackage(opts: {
    name: Record<string, string>;
    description: Record<string, string>;
    emoji: string;
    discountRate: number;
    categories: ServiceCategory[];
  }) {
    const offerings = (await Promise.all(opts.categories.map(platformOffering))).filter(
      (o): o is NonNullable<typeof o> => o !== null,
    );
    if (offerings.length < 2) return;
    await prisma.package.create({
      data: {
        name: opts.name as unknown as Prisma.InputJsonValue,
        description: opts.description as unknown as Prisma.InputJsonValue,
        emoji: opts.emoji,
        discountRate: new Prisma.Decimal(opts.discountRate),
        isActive: true,
        items: { create: offerings.map((o) => ({ offeringId: o.id })) },
      },
    });
  }

  await makePackage({
    emoji: '👰',
    discountRate: 0.15,
    categories: ['HALL', 'PHOTOGRAPHY', 'DECOR', 'BEAUTY'],
    name: { ar: 'باقة العروس الكاملة', fr: 'Pack Mariée Complet', en: 'Complete Bride Package' },
    description: {
      ar: 'قاعة + تصوير + ديكور + تجميل بخصم 15٪',
      fr: 'Salle + photo + décor + beauté, −15 %',
      en: 'Hall + photography + decor + beauty, 15% off',
    },
  });

  await makePackage({
    emoji: '💍',
    discountRate: 0.1,
    categories: ['HALL', 'CATERING', 'CAKE', 'FLOWERS'],
    name: { ar: 'باقة الخطوبة', fr: 'Pack Fiançailles', en: 'Engagement Package' },
    description: {
      ar: 'قاعة + ضيافة + كيك + زهور بخصم 10٪',
      fr: 'Salle + traiteur + gâteau + fleurs, −10 %',
      en: 'Hall + catering + cake + flowers, 10% off',
    },
  });

  await makePackage({
    emoji: '✨',
    discountRate: 0.12,
    categories: ['HALL', 'PHOTOGRAPHY', 'MUSIC'],
    name: { ar: 'الباقة الأساسية', fr: 'Pack Essentiel', en: 'Essential Package' },
    description: {
      ar: 'قاعة + تصوير + موسيقى بخصم 12٪',
      fr: 'Salle + photo + musique, −12 %',
      en: 'Hall + photography + music, 12% off',
    },
  });

  console.log(
    `✅ Seed complete: ${offeringCount} platform offerings + 2 demo vendors + 3 promo packages across ${Object.keys(CATALOG).length} categories.`,
  );
  console.log('   Admin:    admin@hafalati.tn / Admin1234');
  console.log('   Vendor:   vendor@hafalati.tn / Vendor1234 (approved), vendor2@hafalati.tn / Vendor1234 (pending)');
  console.log('   Customer: client@hafalati.tn / Customer1234');
  void CATEGORY_META;
  void AvailabilityMode;
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
