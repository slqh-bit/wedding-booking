/**
 * Domain enums shared between API (Prisma mirrors these) and web.
 * Kept as const objects + string-literal unions so they work in both
 * runtime code and type positions without importing Prisma on the client.
 */

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  VENDOR: 'VENDOR',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ServiceCategory = {
  HALL: 'HALL',
  PHOTOGRAPHY: 'PHOTOGRAPHY',
  DECOR: 'DECOR',
  BEAUTY: 'BEAUTY',
  DRESS: 'DRESS',
  MUSIC: 'MUSIC',
  CATERING: 'CATERING',
  CAKE: 'CAKE',
  FLOWERS: 'FLOWERS',
  INVITATIONS: 'INVITATIONS',
  TRANSPORT: 'TRANSPORT',
} as const;
export type ServiceCategory = (typeof ServiceCategory)[keyof typeof ServiceCategory];

/** Wizard order (matches the flier's "11 steps"). */
export const CATEGORY_ORDER: ServiceCategory[] = [
  ServiceCategory.HALL,
  ServiceCategory.PHOTOGRAPHY,
  ServiceCategory.DECOR,
  ServiceCategory.BEAUTY,
  ServiceCategory.DRESS,
  ServiceCategory.MUSIC,
  ServiceCategory.CATERING,
  ServiceCategory.CAKE,
  ServiceCategory.FLOWERS,
  ServiceCategory.INVITATIONS,
  ServiceCategory.TRANSPORT,
];

export const EventType = {
  WEDDING: 'WEDDING',
  ENGAGEMENT: 'ENGAGEMENT',
  BIRTHDAY: 'BIRTHDAY',
  GRADUATION: 'GRADUATION',
  OTHER: 'OTHER',
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const BookingStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const DepositStatus = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
} as const;
export type DepositStatus = (typeof DepositStatus)[keyof typeof DepositStatus];

export const AvailabilityStatus = {
  AVAILABLE: 'AVAILABLE',
  HELD: 'HELD',
  BOOKED: 'BOOKED',
} as const;
export type AvailabilityStatus = (typeof AvailabilityStatus)[keyof typeof AvailabilityStatus];

export const PaymentMethod = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
  GATEWAY: 'GATEWAY',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/**
 * Whether a category is booked against a specific calendar date (services)
 * or is product-like (ordered with lead time, no hard per-date lock).
 */
export const AvailabilityMode = {
  DATE_BOUND: 'DATE_BOUND',
  PRODUCT: 'PRODUCT',
} as const;
export type AvailabilityMode = (typeof AvailabilityMode)[keyof typeof AvailabilityMode];
