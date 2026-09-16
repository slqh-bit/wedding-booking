/**
 * API response DTOs shared with the web client. These mirror what the API
 * serializes (dates as ISO strings, money as TND numbers).
 */
import type {
  BookingStatus,
  DepositStatus,
  EventType,
  PaymentMethod,
  PaymentStatus,
  ServiceCategory,
  UserRole,
} from './enums.js';
import type { LocalizedString } from './i18n.js';
import type { FiscalBreakdown } from './pricing.js';

export interface UserDTO {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  locale: string;
}

export interface AuthResponse {
  user: UserDTO;
  accessToken: string;
  refreshToken: string;
}

export interface OfferingDTO {
  id: string;
  category: ServiceCategory;
  name: LocalizedString;
  description: LocalizedString;
  basePrice: number;
  emoji: string;
  attributes: Record<string, unknown>;
  imageUrls: string[];
  isActive: boolean;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  vendorName: string;
}

export interface VendorDTO {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  isPlatformOwned: boolean;
  commissionRate: number;
  offeringCount?: number;
  createdAt?: string;
}

export interface CategoryDTO {
  category: ServiceCategory;
  order: number;
  emoji: string;
  label: LocalizedString;
  count: number;
}

export interface AvailabilityDayDTO {
  date: string; // YYYY-MM-DD
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
}

export interface BookingItemDTO {
  id: string;
  category: ServiceCategory;
  offeringId: string;
  name: LocalizedString;
  unitPrice: number;
  emoji: string;
}

export interface PaymentDTO {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  createdAt: string;
}

export interface BookingDTO {
  id: string;
  reference: string;
  eventDate: string;
  eventType: EventType;
  status: BookingStatus;
  items: BookingItemDTO[];
  fiscal: FiscalBreakdown;
  depositStatus: DepositStatus;
  notes: string | null;
  createdAt: string;
  payments: PaymentDTO[];
}

export interface NotificationDTO {
  id: string;
  type: 'BOOKING_RECEIVED' | 'PAYMENT_CONFIRMED';
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'TELEGRAM';
  status: 'PENDING' | 'SENT' | 'FAILED';
  locale: string;
  to: string;
  subject: string;
  bookingRef: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface VendorEarningDTO {
  id: string;
  bookingId: string;
  bookingRef: string;
  eventDate: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  status: 'PENDING' | 'PAID';
  createdAt: string;
  paidAt: string | null;
}

export interface PayoutSummaryDTO {
  vendorId: string;
  vendorName: string;
  bookings: number;
  gross: number;
  commission: number;
  net: number;
  pendingNet: number;
  paidNet: number;
}

export interface VendorEarningsResponse {
  earnings: VendorEarningDTO[];
  totals: { gross: number; commission: number; net: number; pendingNet: number; paidNet: number };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
