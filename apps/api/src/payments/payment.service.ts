import { Prisma } from '@prisma/client';
import { computeTotals } from '@hafalati/shared';
import { prisma } from '../db.js';
import { env, fiscalConfig } from '../env.js';
import { AppError } from '../http/errors.js';
import { toBookingDTO } from '../http/serialize.js';
import { getGateway } from './gateway.factory.js';

const bookingInclude = {
  items: { include: { offering: { select: { emoji: true } } } },
  payments: true,
} satisfies Prisma.BookingInclude;

/**
 * Settle a payment: mark it CONFIRMED, confirm its booking, mark the deposit
 * PAID, and issue an invoice if one doesn't exist yet. Idempotent — a repeated
 * call (e.g. a retried webhook, or admin re-confirming) is a no-op that returns
 * the current booking. Shared by the admin manual-confirm route and the gateway
 * webhook so behaviour never drifts between the two paths.
 */
export async function settlePayment(paymentId: string, opts: { adminId?: string } = {}) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { include: bookingInclude } },
  });
  if (!payment) throw AppError.notFound('payment_not_found', 'Payment not found');

  const booking = payment.booking;

  if (payment.status === 'CONFIRMED' && booking.status === 'CONFIRMED') {
    return toBookingDTO(await reload(booking.id));
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'CONFIRMED', confirmedByAdminId: opts.adminId ?? null },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED', depositStatus: 'PAID' },
    });

    const existingInvoice = await tx.invoice.findUnique({ where: { bookingId: booking.id } });
    if (!existingInvoice) {
      const fiscal = computeTotals(
        booking.items.map((i) => ({ unitPrice: Number(i.unitPrice) })),
        fiscalConfig,
      );
      const year = new Date().getUTCFullYear();
      const count = await tx.invoice.count();
      const number = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
      await tx.invoice.create({
        data: {
          bookingId: booking.id,
          number,
          subtotal: new Prisma.Decimal(fiscal.subtotal),
          tva: new Prisma.Decimal(fiscal.tva),
          timbreFiscal: new Prisma.Decimal(fiscal.timbreFiscal),
          total: new Prisma.Decimal(fiscal.total),
        },
      });
    }
  });

  return toBookingDTO(await reload(booking.id));
}

/** Mark a payment FAILED (gateway reported failure/expiry). */
export async function failPayment(paymentId: string) {
  await prisma.payment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
}

/**
 * Initialize an online gateway payment for a booking's deposit. Reuses the
 * pending deposit Payment created at booking confirmation (or creates one),
 * flips it to method GATEWAY, and returns the hosted checkout URL.
 */
export async function initGatewayPayment(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, payments: true },
  });
  if (!booking || booking.userId !== userId) {
    throw AppError.notFound('booking_not_found', 'Booking not found');
  }
  if (booking.status !== 'PENDING') {
    throw AppError.conflict('invalid_status', 'Only pending bookings can be paid online');
  }
  if (booking.depositStatus === 'PAID') {
    throw AppError.conflict('already_paid', 'Deposit already paid');
  }

  // Reuse an existing pending deposit payment, else create one.
  const deposit =
    booking.payments.find((p) => p.status === 'PENDING') ??
    (await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.depositAmount,
        method: 'GATEWAY',
        status: 'PENDING',
      },
    }));

  const gateway = getGateway();
  const returnUrl = `${env.PUBLIC_WEB_URL}/payment/return?payment=${deposit.id}`;
  const webhookUrl = `${env.PUBLIC_API_URL}/api/v1/payments/webhook/${gateway.name}`;

  const { providerRef, checkoutUrl } = await gateway.initPayment({
    bookingId: booking.id,
    paymentId: deposit.id,
    amount: Number(booking.depositAmount),
    reference: booking.reference,
    description: `عربون حجز ${booking.reference} — حفلاتي`,
    customer: {
      fullName: booking.user.fullName,
      email: booking.user.email,
      phone: booking.user.phone,
    },
    returnUrl,
    webhookUrl,
  });

  await prisma.payment.update({
    where: { id: deposit.id },
    data: { method: 'GATEWAY', provider: gateway.name, providerRef, checkoutUrl },
  });

  return { paymentId: deposit.id, checkoutUrl };
}

/** Payment status for the return-page poll (owner-scoped). */
export async function getPaymentStatus(userId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { select: { userId: true, status: true, reference: true } } },
  });
  if (!payment || payment.booking.userId !== userId) {
    throw AppError.notFound('payment_not_found', 'Payment not found');
  }
  return {
    status: payment.status,
    bookingStatus: payment.booking.status,
    reference: payment.booking.reference,
  };
}

async function reload(bookingId: string) {
  return prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: bookingInclude });
}

/** Find a payment id from a gateway providerRef (used by webhook handling). */
export async function paymentIdByProviderRef(providerRef: string): Promise<string | null> {
  const p = await prisma.payment.findUnique({ where: { providerRef }, select: { id: true } });
  return p?.id ?? null;
}

/**
 * Apply a parsed webhook result to our records. Shared by the real webhook
 * route and the dev mock-complete endpoint. Unknown providerRefs are ignored
 * (returns 'unknown') so the gateway isn't told to retry forever.
 */
export async function applyWebhookResult(result: {
  providerRef: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}): Promise<'settled' | 'failed' | 'ignored' | 'unknown'> {
  const paymentId = await paymentIdByProviderRef(result.providerRef);
  if (!paymentId) return 'unknown';
  if (result.status === 'CONFIRMED') {
    await settlePayment(paymentId);
    return 'settled';
  }
  if (result.status === 'FAILED') {
    await failPayment(paymentId);
    return 'failed';
  }
  return 'ignored';
}
