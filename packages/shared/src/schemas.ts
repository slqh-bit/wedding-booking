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
  // Absolute http(s) URL or a relative /uploads/... path from the upload API.
  imageUrls: z
    .array(z.string().max(500).refine((s) => /^https?:\/\//.test(s) || s.startsWith('/uploads/'), 'invalid_image_url'))
    .default([]),
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

export const createBookingSchema = z
  .object({
    eventDate: eventDateSchema,
    eventType: eventTypeSchema,
    /** One selected offering id per chosen category. */
    offeringIds: z.array(z.string().cuid()).default([]),
    /** When set, the booking is built from a curated promo package instead. */
    packageId: z.string().cuid().optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((b) => b.packageId || b.offeringIds.length > 0, {
    message: 'select_at_least_one',
    path: ['offeringIds'],
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

// ── Vendors (Phase 3) ───────────────────────────────────
export const vendorStatusSchema = z.enum(['PENDING', 'APPROVED', 'SUSPENDED']);
export const moderationStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

/** Public vendor self-registration: a user account + a vendor profile. */
export const vendorRegisterSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  phone: phoneSchema,
  password: z.string().min(8).max(128),
  locale: localeSchema.optional(),
  vendorName: z.string().trim().min(2).max(120),
  description: z.string().max(1000).optional(),
  city: z.string().max(120).optional(),
});
export type VendorRegisterInput = z.infer<typeof vendorRegisterSchema>;

/** Vendor edits its own profile. */
export const vendorProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(1000).optional(),
  phone: phoneSchema.optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  city: z.string().max(120).optional(),
  logoUrl: z.string().url().optional(),
});
export type VendorProfileInput = z.infer<typeof vendorProfileSchema>;

/** Admin creates a vendor (approved immediately); optional linked login. */
export const adminVendorCreateSchema = z.object({
  vendorName: z.string().trim().min(2).max(120),
  description: z.string().max(1000).optional(),
  phone: phoneSchema.optional(),
  city: z.string().max(120).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  owner: z
    .object({
      fullName: z.string().trim().min(2).max(120),
      email: z.string().trim().email().toLowerCase(),
      phone: phoneSchema,
      password: z.string().min(8).max(128),
    })
    .optional(),
});
export type AdminVendorCreateInput = z.infer<typeof adminVendorCreateSchema>;

// ── Promo packages (Phase 3 slice 5) ────────────────────
export const packageInputSchema = z.object({
  name: localizedStringSchema,
  description: localizedStringSchema,
  emoji: z.string().max(8).optional(),
  imageUrl: z.string().url().optional(),
  discountRate: z.number().min(0).max(0.9),
  isActive: z.boolean().default(true),
  /** The offerings bundled into this package (at least two to be a "bundle"). */
  offeringIds: z.array(z.string().cuid()).min(2, 'need_two_offerings'),
});
export type PackageInput = z.infer<typeof packageInputSchema>;

export const packageUpdateSchema = packageInputSchema.partial();

// ── Catalog search (Phase 3 slice 4) ────────────────────
export const sortKeySchema = z.enum(['price_asc', 'price_desc', 'rating_desc', 'newest']);
export type SortKey = z.infer<typeof sortKeySchema>;

/**
 * Public catalog search/filter. All fields optional — query strings arrive as
 * strings, so numbers are coerced. Bounds are clamped for a sane page size.
 */
export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: categorySchema.optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: sortKeySchema.default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

// ── Reviews (Phase 3 slice 3) ───────────────────────────
export const reviewStatusSchema = z.enum(['PUBLISHED', 'HIDDEN']);

/** Customer rates an offering (1–5 stars) after a COMPLETED booking with it. */
export const reviewInputSchema = z.object({
  offeringId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

/** Availability generation for an owned offering (a date range to open/close). */
export const availabilityRangeSchema = z.object({
  from: eventDateSchema,
  to: eventDateSchema,
  open: z.boolean().default(true),
});
export type AvailabilityRangeInput = z.infer<typeof availabilityRangeSchema>;
