import type { PayoutSummaryDTO, VendorEarningsResponse } from '@hafalati/shared';
import { prisma } from '../db.js';
import { decToNum } from '../http/serialize.js';

/** A vendor's earning rows + totals (pending/paid net). */
export async function earningsForVendorId(vendorId: string): Promise<VendorEarningsResponse> {
  const rows = await prisma.vendorEarning.findMany({
    where: { vendorId },
    include: { booking: { select: { reference: true, eventDate: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const earnings = rows.map((e) => ({
    id: e.id,
    bookingId: e.bookingId,
    bookingRef: e.booking.reference,
    eventDate: e.booking.eventDate.toISOString().slice(0, 10),
    grossAmount: decToNum(e.grossAmount),
    commissionRate: decToNum(e.commissionRate),
    commissionAmount: decToNum(e.commissionAmount),
    netAmount: decToNum(e.netAmount),
    status: e.status,
    createdAt: e.createdAt.toISOString(),
    paidAt: e.paidAt ? e.paidAt.toISOString() : null,
  }));

  const totals = earnings.reduce(
    (acc, e) => {
      acc.gross += e.grossAmount;
      acc.commission += e.commissionAmount;
      acc.net += e.netAmount;
      if (e.status === 'PAID') acc.paidNet += e.netAmount;
      else acc.pendingNet += e.netAmount;
      return acc;
    },
    { gross: 0, commission: 0, net: 0, pendingNet: 0, paidNet: 0 },
  );
  // Guard against float drift.
  for (const k of Object.keys(totals) as (keyof typeof totals)[]) totals[k] = Math.round(totals[k] * 1000) / 1000;

  return { earnings, totals };
}

/** Per-vendor payout summary across all vendors that have earnings. */
export async function payoutSummaries(): Promise<PayoutSummaryDTO[]> {
  const rows = await prisma.vendorEarning.findMany({
    include: { vendor: { select: { name: true } } },
  });

  const map = new Map<string, PayoutSummaryDTO>();
  for (const e of rows) {
    const cur =
      map.get(e.vendorId) ??
      {
        vendorId: e.vendorId,
        vendorName: e.vendor.name,
        bookings: 0,
        gross: 0,
        commission: 0,
        net: 0,
        pendingNet: 0,
        paidNet: 0,
      };
    cur.bookings += 1;
    cur.gross += decToNum(e.grossAmount);
    cur.commission += decToNum(e.commissionAmount);
    cur.net += decToNum(e.netAmount);
    if (e.status === 'PAID') cur.paidNet += decToNum(e.netAmount);
    else cur.pendingNet += decToNum(e.netAmount);
    map.set(e.vendorId, cur);
  }

  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  return [...map.values()]
    .map((s) => ({
      ...s,
      gross: round3(s.gross),
      commission: round3(s.commission),
      net: round3(s.net),
      pendingNet: round3(s.pendingNet),
      paidNet: round3(s.paidNet),
    }))
    .sort((a, b) => b.pendingNet - a.pendingNet);
}

/** Mark all of a vendor's PENDING earnings as PAID (records a payout). */
export async function settleVendorPayout(vendorId: string) {
  await prisma.vendorEarning.updateMany({
    where: { vendorId, status: 'PENDING' },
    data: { status: 'PAID', paidAt: new Date() },
  });
  return earningsForVendorId(vendorId);
}
