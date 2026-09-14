import type { UserRole } from '@hafalati/shared';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { AppError } from '../http/errors.js';
import { decToNum } from '../http/serialize.js';
import type { InvoicePdfData } from './invoice.pdf.js';

function frName(snapshot: unknown): string {
  const v = (snapshot ?? {}) as { fr?: string; ar?: string; en?: string };
  return v.fr || v.ar || v.en || '—';
}

/** Load + authorize the data needed to render a booking's invoice PDF. */
export async function getInvoicePdfData(
  userId: string,
  role: UserRole,
  bookingId: string,
): Promise<InvoicePdfData> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { invoice: true, items: true, user: true },
  });
  if (!booking) throw AppError.notFound('booking_not_found', 'Booking not found');
  if (booking.userId !== userId && role !== 'ADMIN') {
    throw AppError.notFound('booking_not_found', 'Booking not found');
  }
  if (!booking.invoice) {
    throw AppError.conflict('invoice_not_ready', 'Invoice is issued once the deposit is confirmed');
  }

  return {
    invoice: {
      number: booking.invoice.number,
      issuedAt: booking.invoice.issuedAt,
      subtotal: decToNum(booking.invoice.subtotal),
      tva: decToNum(booking.invoice.tva),
      timbreFiscal: decToNum(booking.invoice.timbreFiscal),
      total: decToNum(booking.invoice.total),
    },
    deposit: decToNum(booking.depositAmount),
    booking: {
      reference: booking.reference,
      eventDate: booking.eventDate.toISOString().slice(0, 10),
      eventType: booking.eventType,
    },
    customer: {
      fullName: booking.user.fullName,
      email: booking.user.email,
      phone: booking.user.phone,
    },
    items: booking.items.map((i) => ({ name: frName(i.snapshot), unitPrice: decToNum(i.unitPrice) })),
    platform: {
      name: env.PLATFORM_NAME,
      address: env.PLATFORM_ADDRESS,
      phone: env.PLATFORM_PHONE,
      email: env.PLATFORM_EMAIL,
    },
  };
}
