import { Prisma } from '@prisma/client';
import {
  computeTotals,
  isLocale,
  type Locale,
  type NotificationDTO,
  type NotificationType,
} from '@hafalati/shared';
import { prisma } from '../db.js';
import { fiscalConfig } from '../env.js';
import { logger } from '../logger.js';
import { getEmailChannel } from './channel.factory.js';
import { renderTemplate } from './templates.js';

/**
 * Send a notification for a booking event. Best-effort: never throws to the
 * caller, so a mail failure can't break the booking/payment flow. Deduped by
 * the unique (bookingId, type) constraint — a retried webhook won't re-send.
 */
async function notify(type: NotificationType, bookingId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, items: true, invoice: true },
    });
    if (!booking) return;

    const locale: Locale = isLocale(booking.user.locale) ? booking.user.locale : 'ar';
    const fiscal = computeTotals(
      booking.items.map((i) => ({ unitPrice: Number(i.unitPrice) })),
      fiscalConfig,
    );

    const { subject, body } = renderTemplate(type, locale, {
      customerName: booking.user.fullName,
      reference: booking.reference,
      eventType: booking.eventType,
      eventDate: booking.eventDate.toISOString().slice(0, 10),
      total: fiscal.total,
      deposit: fiscal.deposit,
      invoiceNumber: booking.invoice?.number,
    });

    const channel = getEmailChannel();

    // Claim the (booking, type) slot first — a unique conflict means it was
    // already sent/queued, so we skip silently (idempotent).
    let record;
    try {
      record = await prisma.notification.create({
        data: {
          userId: booking.userId,
          bookingId: booking.id,
          channel: 'EMAIL',
          type,
          locale,
          to: booking.user.email,
          subject,
          body,
          status: 'PENDING',
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return; // already notified for this booking + type
      }
      throw err;
    }

    const result = await channel.send({ to: booking.user.email, subject, body });
    await prisma.notification.update({
      where: { id: record.id },
      data: result.ok
        ? { status: 'SENT', sentAt: new Date() }
        : { status: 'FAILED', error: result.error ?? 'unknown' },
    });
  } catch (err) {
    logger.error({ err, bookingId, type }, 'Notification failed');
  }
}

export function notifyBookingReceived(bookingId: string): Promise<void> {
  return notify('BOOKING_RECEIVED', bookingId);
}

export function notifyPaymentConfirmed(bookingId: string): Promise<void> {
  return notify('PAYMENT_CONFIRMED', bookingId);
}

/** Admin: recent notifications (newest first). */
export async function listNotifications(limit = 100): Promise<NotificationDTO[]> {
  const rows = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { booking: { select: { reference: true } } },
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    channel: n.channel,
    status: n.status,
    locale: n.locale,
    to: n.to,
    subject: n.subject,
    bookingRef: n.booking?.reference ?? null,
    createdAt: n.createdAt.toISOString(),
    sentAt: n.sentAt ? n.sentAt.toISOString() : null,
  }));
}
