import { z } from 'zod';
import { CATEGORY_ORDER } from './enums.js';

/** Tunisian phone: +216 XX XXX XXX or local 8-digit forms. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+216)?[0-9]{8}$/, 'invalid_tunisian_phone');

export const localeSchema = z.enum(['ar', 'fr', 'en']);

export const localizedStringSchema = z.object({
  ar: z.string().min(1),
  fr: z.string().min(1),
  en: z.string().min(1),
});

// ── Auth ────────────────────────────────────────────────
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  phone: phoneSchema,
  password: z.string().min(8).max(128),
  locale: localeSchema.optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

// ── Catalog (admin write) ───────────────────────────────
export const categorySchema = z.enum(
  CATEGORY_ORDER as [string, ...string[]],
);

export const offeringInputSchema = z.object({
  category: categorySchema,
  name: localizedStringSchema,
  description: localizedStringSchema,
  basePrice: z.number().nonnegative(),
  emoji: z.string().max(8).optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
  imageUrls: z.array(z.string().url()).default([]),
  isActive: z.boolean().default(true),
});
export type OfferingInput = z.infer<typeof offeringInputSchema>;

export const offeringUpdateSchema = offeringInputSchema.partial();

// ── Bookings ────────────────────────────────────────────
export const eventTypeSchema = z.enum([
  'WEDDING',
  'ENGAGEMENT',
  'BIRTHDAY',
  'GRADUATION',
  'OTHER',
]);

/** ISO date (YYYY-MM-DD) for the event day. */
export const eventDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_date')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'invalid_date');

export const createBookingSchema = z.object({
  eventDate: eventDateSchema,
  eventType: eventTypeSchema,
  /** One selected offering id per chosen category. At least one required. */
  offeringIds: z.array(z.string().cuid()).min(1, 'select_at_least_one'),
  notes: z.string().max(1000).optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ── Payments (admin confirm) ────────────────────────────
export const paymentMethodSchema = z.enum(['BANK_TRANSFER', 'CASH', 'GATEWAY']);

export const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  method: paymentMethodSchema,
  reference: z.string().max(120).optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
