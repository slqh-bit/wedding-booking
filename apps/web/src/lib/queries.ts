/** Typed API endpoint helpers used by react-query hooks. */
import type {
  AuthResponse,
  BookingDTO,
  CategoryDTO,
  CreateBookingInput,
  NotificationDTO,
  OfferingDTO,
  PackageDTO,
  Paginated,
  PayoutSummaryDTO,
  ReviewDTO,
  VendorDTO,
  VendorEarningsResponse,
} from '@hafalati/shared';
import { api, downloadFile } from './api.js';

export interface PlatformInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  bankTransferDetails: string;
  fiscal: { tvaRate: number; timbreFiscalTnd: number; depositRate: number };
}

export const endpoints = {
  platform: () => api.get<PlatformInfo>('/platform'),
  categories: () => api.get<{ data: CategoryDTO[] }>('/categories').then((r) => r.data),
  offerings: (category: string) =>
    api.get<{ data: OfferingDTO[] }>(`/offerings?category=${category}`).then((r) => r.data),
  searchOfferings: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return api.get<Paginated<OfferingDTO>>(`/search?${qs.toString()}`);
  },

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  register: (body: Record<string, unknown>) => api.post<AuthResponse>('/auth/register', body),
  me: () => api.get<{ user: AuthResponse['user'] }>('/auth/me', true).then((r) => r.user),

  createBooking: (body: CreateBookingInput) => api.post<BookingDTO>('/bookings', body, true),
  confirmBooking: (id: string) => api.post<BookingDTO>(`/bookings/${id}/confirm`, undefined, true),
  cancelBooking: (id: string) => api.post<BookingDTO>(`/bookings/${id}/cancel`, undefined, true),
  myBookings: () => api.get<{ data: BookingDTO[] }>('/bookings', true).then((r) => r.data),
  downloadInvoice: (bookingId: string, ref: string) =>
    downloadFile(`/bookings/${bookingId}/invoice`, `facture-${ref}.pdf`),

  // Payments (Phase 2 gateway)
  payDeposit: (bookingId: string) =>
    api.post<{ paymentId: string; checkoutUrl: string }>(`/bookings/${bookingId}/pay`, undefined, true),
  paymentStatus: (paymentId: string) =>
    api.get<{ status: string; bookingStatus: string; reference: string }>(
      `/payments/${paymentId}/status`,
      true,
    ),
  mockComplete: (providerRef: string, status: 'CONFIRMED' | 'FAILED') =>
    api.post<{ ok: boolean; outcome: string }>(`/payments/mock/${providerRef}/complete`, { status }),

  // Admin
  adminStats: () => api.get<AdminStats>('/admin/stats', true),
  adminBookings: (status?: string) =>
    api
      .get<{ data: BookingDTO[] }>(`/admin/bookings${status ? `?status=${status}` : ''}`, true)
      .then((r) => r.data),
  adminOfferings: () => api.get<{ data: OfferingDTO[] }>('/admin/offerings', true).then((r) => r.data),
  adminNotifications: () =>
    api.get<{ data: NotificationDTO[] }>('/admin/notifications', true).then((r) => r.data),

  // Telegram account linking
  telegramStatus: () => api.get<{ linked: boolean }>('/notifications/telegram/status', true),
  telegramLink: () =>
    api.post<{ code: string; deepLink: string | null; botConfigured: boolean }>(
      '/notifications/telegram/link',
      undefined,
      true,
    ),
  telegramUnlink: () => api.post<{ linked: boolean }>('/notifications/telegram/unlink', undefined, true),
  telegramMockLink: (code: string) =>
    api.post<{ linked: boolean }>('/notifications/telegram/mock-link', { code }),
  confirmPayment: (paymentId: string) =>
    api.post<BookingDTO>(`/admin/payments/${paymentId}/confirm`, undefined, true),
  setBookingStatus: (id: string, status: string) =>
    api.patch<BookingDTO>(`/admin/bookings/${id}/status`, { status }, true),

  // Admin marketplace moderation
  adminVendors: (status?: string) =>
    api
      .get<{ data: VendorDTO[] }>(`/admin/vendors${status ? `?status=${status}` : ''}`, true)
      .then((r) => r.data),
  setVendorStatus: (id: string, status: string) =>
    api.patch<VendorDTO>(`/admin/vendors/${id}/status`, { status }, true),
  adminOfferingsByModeration: (moderationStatus: string) =>
    api
      .get<{ data: OfferingDTO[] }>(`/admin/offerings?moderationStatus=${moderationStatus}`, true)
      .then((r) => r.data),
  setOfferingModeration: (id: string, status: string) =>
    api.patch<OfferingDTO>(`/admin/offerings/${id}/moderation`, { status }, true),

  // Vendor dashboard
  registerVendor: (body: Record<string, unknown>) =>
    api.post<AuthResponse>('/vendors/register', body),
  vendorMe: () => api.get<VendorDTO>('/vendor/me', true),
  updateVendor: (body: Record<string, unknown>) => api.patch<VendorDTO>('/vendor/me', body, true),
  vendorOfferings: () =>
    api.get<{ data: OfferingDTO[] }>('/vendor/offerings', true).then((r) => r.data),
  createVendorOffering: (body: Record<string, unknown>) =>
    api.post<OfferingDTO>('/vendor/offerings', body, true),
  updateVendorOffering: (id: string, body: Record<string, unknown>) =>
    api.patch<OfferingDTO>(`/vendor/offerings/${id}`, body, true),
  deleteVendorOffering: (id: string) => api.delete<unknown>(`/vendor/offerings/${id}`),
  setVendorAvailability: (id: string, from: string, to: string, open: boolean) =>
    api.post<{ updated: number }>(`/vendor/offerings/${id}/availability`, { from, to, open }, true),
  vendorBookings: () => api.get<{ data: VendorBooking[] }>('/vendor/bookings', true).then((r) => r.data),
  vendorStats: () => api.get<VendorStats>('/vendor/stats', true),
  vendorEarnings: () => api.get<VendorEarningsResponse>('/vendor/earnings', true),

  // Admin payouts
  adminPayouts: () => api.get<{ data: PayoutSummaryDTO[] }>('/admin/payouts', true).then((r) => r.data),
  settleVendorPayout: (vendorId: string) =>
    api.post<VendorEarningsResponse>(`/admin/payouts/${vendorId}/settle`, undefined, true),

  // Promo packages (Phase 3 slice 5)
  packages: () => api.get<{ data: PackageDTO[] }>('/packages').then((r) => r.data),
  getPackage: (id: string) => api.get<PackageDTO>(`/packages/${id}`),
  adminPackages: () => api.get<{ data: PackageDTO[] }>('/admin/packages', true).then((r) => r.data),
  createPackage: (body: Record<string, unknown>) => api.post<PackageDTO>('/admin/packages', body, true),
  updatePackage: (id: string, body: Record<string, unknown>) =>
    api.patch<PackageDTO>(`/admin/packages/${id}`, body, true),
  deletePackage: (id: string) => api.delete<unknown>(`/admin/packages/${id}`),

  // Reviews & ratings (Phase 3 slice 3)
  offeringReviews: (offeringId: string) =>
    api.get<{ data: ReviewDTO[] }>(`/offerings/${offeringId}/reviews`).then((r) => r.data),
  myReviews: () => api.get<{ data: ReviewDTO[] }>('/reviews/mine', true).then((r) => r.data),
  submitReview: (body: { offeringId: string; rating: number; comment?: string }) =>
    api.post<ReviewDTO>('/reviews', body, true),
  adminReviews: (status?: string) =>
    api
      .get<{ data: ReviewDTO[] }>(`/admin/reviews${status ? `?status=${status}` : ''}`, true)
      .then((r) => r.data),
  setReviewStatus: (id: string, status: string) =>
    api.patch<ReviewDTO>(`/admin/reviews/${id}/status`, { status }, true),
};

export interface VendorBooking {
  id: string;
  reference: string;
  eventDate: string;
  eventType: string;
  status: string;
  items: { category: string; emoji: string; name: Record<string, string>; unitPrice: number }[];
  vendorSubtotal: number;
}

export interface VendorStats {
  status: string;
  commissionRate: number;
  offeringsByModeration: Record<string, number>;
  bookings: number;
  grossRevenue: number;
  estimatedCommission: number;
  estimatedNet: number;
  ratingAvg: number;
  ratingCount: number;
}

export interface AdminStats {
  bookingsByStatus: Record<string, number>;
  confirmedRevenue: number;
  upcomingEvents: number;
  activeOfferings: number;
  customers: number;
}
