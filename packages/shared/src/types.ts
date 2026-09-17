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
  /** Average of published review ratings (0 when none), 1 decimal. */
  ratingAvg: number;
  /** Number of published reviews. */
  ratingCount: number;
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
  /** Average of published review ratings across this vendor's offerings. */
  ratingAvg?: number;
  ratingCount?: number;
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

export interface PackageDTO {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  emoji: string;
  imageUrl: string | null;
  discountRate: number;
  isActive: boolean;
  offerings: OfferingDTO[];
  /** Sum of the included offerings' base prices (TND). */
  originalTotal: number;
  /** originalTotal × (1 − discountRate), millime precision. */
  discountedTotal: number;
  /** originalTotal − discountedTotal. */
  savings: number;
}

export interface ReviewDTO {
  id: string;
  offeringId: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  status: 'PUBLISHED' | 'HIDDEN';
  authorName: string;
  offeringName: LocalizedString;
  createdAt: string;
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

export interface AnalyticsDTO {
  kpis: {
    confirmedRevenue: number;
    totalBookings: number;
    customers: number;
    avgRating: number;
    reviewCount: number;
    activeOfferings: number;
  };
  /** Confirmed/completed booking revenue bucketed by month (oldest → newest). */
  revenueByMonth: { month: string; revenue: number; bookings: number }[];
  bookingsByStatus: Record<string, number>;
  topOfferings: {
    offeringId: string;
    name: LocalizedString;
    category: ServiceCategory;
    revenue: number;
    bookings: number;
  }[];
  /** Published-review counts per star, 1 → 5. */
  ratingsDistribution: { rating: number; count: number }[];
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
