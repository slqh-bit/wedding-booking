import { formatTND, type Locale, type NotificationType } from '@hafalati/shared';

export interface TemplateContext {
  customerName: string;
  reference: string;
  eventType: string; // enum key, e.g. WEDDING
  eventDate: string; // YYYY-MM-DD
  total: number;
  deposit: number;
  invoiceNumber?: string;
}

export interface RenderedMessage {
  subject: string;
  body: string;
}

const EVENT_TYPE_LABEL: Record<Locale, Record<string, string>> = {
  ar: {
    WEDDING: 'زفاف',
    ENGAGEMENT: 'خطوبة',
    BIRTHDAY: 'عيد ميلاد',
    GRADUATION: 'تخرّج',
    OTHER: 'مناسبة',
  },
  fr: {
    WEDDING: 'Mariage',
    ENGAGEMENT: 'Fiançailles',
    BIRTHDAY: 'Anniversaire',
    GRADUATION: 'Remise de diplôme',
    OTHER: 'Événement',
  },
  en: {
    WEDDING: 'Wedding',
    ENGAGEMENT: 'Engagement',
    BIRTHDAY: 'Birthday',
    GRADUATION: 'Graduation',
    OTHER: 'Event',
  },
};

function eventLabel(locale: Locale, key: string): string {
  return EVENT_TYPE_LABEL[locale][key] ?? key;
}

/** Render a notification's subject + plain-text body in the customer's locale. */
export function renderTemplate(
  type: NotificationType,
  locale: Locale,
  ctx: TemplateContext,
): RenderedMessage {
  const money = (n: number) => formatTND(n, locale);
  const evt = eventLabel(locale, ctx.eventType);

  if (type === 'BOOKING_RECEIVED') {
    if (locale === 'fr') {
      return {
        subject: `Hafalati — demande de réservation ${ctx.reference} reçue`,
        body: [
          `Bonjour ${ctx.customerName},`,
          '',
          `Nous avons bien reçu votre demande de réservation (${evt}) pour le ${ctx.eventDate}.`,
          `Référence : ${ctx.reference}`,
          `Total estimé : ${money(ctx.total)} — acompte à régler : ${money(ctx.deposit)}.`,
          '',
          'Réglez l’acompte en ligne ou par virement pour confirmer votre réservation.',
          '',
          'Merci de votre confiance,',
          'L’équipe Hafalati',
        ].join('\n'),
      };
    }
    if (locale === 'en') {
      return {
        subject: `Hafalati — booking request ${ctx.reference} received`,
        body: [
          `Hello ${ctx.customerName},`,
          '',
          `We’ve received your booking request (${evt}) for ${ctx.eventDate}.`,
          `Reference: ${ctx.reference}`,
          `Estimated total: ${money(ctx.total)} — deposit due: ${money(ctx.deposit)}.`,
          '',
          'Pay the deposit online or by bank transfer to confirm your booking.',
          '',
          'Thank you,',
          'The Hafalati team',
        ].join('\n'),
      };
    }
    return {
      subject: `حفلاتي — تم استلام طلب الحجز ${ctx.reference}`,
      body: [
        `مرحباً ${ctx.customerName}،`,
        '',
        `استلمنا طلب حجزك (${evt}) بتاريخ ${ctx.eventDate}.`,
        `رقم الحجز: ${ctx.reference}`,
        `الإجمالي التقديري: ${money(ctx.total)} — العربون المطلوب: ${money(ctx.deposit)}.`,
        '',
        'ادفع العربون إلكترونياً أو عبر التحويل البنكي لتأكيد حجزك.',
        '',
        'شكراً لثقتك،',
        'فريق حفلاتي',
      ].join('\n'),
    };
  }

  // PAYMENT_CONFIRMED
  const inv = ctx.invoiceNumber ? ` (${ctx.invoiceNumber})` : '';
  if (locale === 'fr') {
    return {
      subject: `Hafalati — réservation ${ctx.reference} confirmée ✅`,
      body: [
        `Bonjour ${ctx.customerName},`,
        '',
        `Votre acompte de ${money(ctx.deposit)} a bien été reçu.`,
        `Votre réservation ${ctx.reference} (${evt}, ${ctx.eventDate}) est confirmée.`,
        `Facture${inv} — total : ${money(ctx.total)}.`,
        '',
        'Nous avons hâte de célébrer avec vous !',
        'L’équipe Hafalati',
      ].join('\n'),
    };
  }
  if (locale === 'en') {
    return {
      subject: `Hafalati — booking ${ctx.reference} confirmed ✅`,
      body: [
        `Hello ${ctx.customerName},`,
        '',
        `Your deposit of ${money(ctx.deposit)} has been received.`,
        `Your booking ${ctx.reference} (${evt}, ${ctx.eventDate}) is confirmed.`,
        `Invoice${inv} — total: ${money(ctx.total)}.`,
        '',
        'We can’t wait to celebrate with you!',
        'The Hafalati team',
      ].join('\n'),
    };
  }
  return {
    subject: `حفلاتي — تم تأكيد حجزك ${ctx.reference} ✅`,
    body: [
      `مرحباً ${ctx.customerName}،`,
      '',
      `تم استلام عربونك بقيمة ${money(ctx.deposit)}.`,
      `حجزك ${ctx.reference} (${evt}، ${ctx.eventDate}) مؤكّد الآن.`,
      `الفاتورة${inv} — الإجمالي: ${money(ctx.total)}.`,
      '',
      'في انتظار الاحتفال معك!',
      'فريق حفلاتي',
    ].join('\n'),
  };
}
