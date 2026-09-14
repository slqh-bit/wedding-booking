import type { Prisma } from '@prisma/client';
import {
  computeTotals,
  type BookingDTO,
  type BookingItemDTO,
  type LocalizedString,
  type OfferingDTO,
  type PaymentDTO,
  type ServiceCategory,
  type UserDTO,
} from '@hafalati/shared';
import { fiscalConfig } from '../env.js';

type DecimalLike = Prisma.Decimal | number | string;

export function decToNum(d: DecimalLike): number {
  return typeof d === 'number' ? d : Number(d.toString());
}

function asLocalized(json: unknown): LocalizedString {
  const v = (json ?? {}) as Partial<LocalizedString>;
  return { ar: v.ar ?? '', fr: v.fr ?? '', en: v.en ?? '' };
}

export function toUserDTO(u: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  locale: string;
}): UserDTO {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role as UserDTO['role'],
    locale: u.locale,
  };
}

export function toOfferingDTO(o: {
  id: string;
  category: string;
  name: unknown;
  description: unknown;
  basePrice: DecimalLike;
  emoji: string;
  attributes: unknown;
  imageUrls: string[];
  isActive: boolean;
  vendor?: { name: string } | null;
}): OfferingDTO {
  return {
    id: o.id,
    category: o.category as ServiceCategory,
    name: asLocalized(o.name),
    description: asLocalized(o.description),
    basePrice: decToNum(o.basePrice),
    emoji: o.emoji,
    attributes: (o.attributes ?? {}) as Record<string, unknown>,
    imageUrls: o.imageUrls,
    isActive: o.isActive,
    vendorName: o.vendor?.name ?? '',
  };
}

function toItemDTO(i: {
  id: string;
  category: string;
  offeringId: string;
  snapshot: unknown;
  unitPrice: DecimalLike;
  offering?: { emoji: string } | null;
}): BookingItemDTO {
  return {
    id: i.id,
    category: i.category as ServiceCategory,
    offeringId: i.offeringId,
    name: asLocalized(i.snapshot),
    unitPrice: decToNum(i.unitPrice),
    emoji: i.offering?.emoji ?? '✨',
  };
}

function toPaymentDTO(p: {
  id: string;
  amount: DecimalLike;
  method: string;
  status: string;
  reference: string | null;
  createdAt: Date;
}): PaymentDTO {
  return {
    id: p.id,
    amount: decToNum(p.amount),
    method: p.method as PaymentDTO['method'],
    status: p.status as PaymentDTO['status'],
    reference: p.reference,
    createdAt: p.createdAt.toISOString(),
  };
}

export function toBookingDTO(b: {
  id: string;
  reference: string;
  eventDate: Date;
  eventType: string;
  status: string;
  notes: string | null;
  depositStatus: string;
  createdAt: Date;
  items: Parameters<typeof toItemDTO>[0][];
  payments?: Parameters<typeof toPaymentDTO>[0][];
}): BookingDTO {
  const items = b.items.map(toItemDTO);
  // Fiscal breakdown is recomputed from item unit prices — single source of truth.
  const fiscal = computeTotals(
    items.map((i) => ({ unitPrice: i.unitPrice })),
    fiscalConfig,
  );
  return {
    id: b.id,
    reference: b.reference,
    eventDate: b.eventDate.toISOString().slice(0, 10),
    eventType: b.eventType as BookingDTO['eventType'],
    status: b.status as BookingDTO['status'],
    items,
    fiscal,
    depositStatus: b.depositStatus as BookingDTO['depositStatus'],
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    payments: (b.payments ?? []).map(toPaymentDTO),
  };
}
