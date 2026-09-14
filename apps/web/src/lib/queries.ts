/** Typed API endpoint helpers used by react-query hooks. */
import type {
  AuthResponse,
  BookingDTO,
  CategoryDTO,
  CreateBookingInput,
  OfferingDTO,
} from '@hafalati/shared';
import { api } from './api.js';

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

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  register: (body: Record<string, unknown>) => api.post<AuthResponse>('/auth/register', body),
  me: () => api.get<{ user: AuthResponse['user'] }>('/auth/me', true).then((r) => r.user),

  createBooking: (body: CreateBookingInput) => api.post<BookingDTO>('/bookings', body, true),
  confirmBooking: (id: string) => api.post<BookingDTO>(`/bookings/${id}/confirm`, undefined, true),
  cancelBooking: (id: string) => api.post<BookingDTO>(`/bookings/${id}/cancel`, undefined, true),
  myBookings: () => api.get<{ data: BookingDTO[] }>('/bookings', true).then((r) => r.data),

  // Admin
  adminStats: () => api.get<AdminStats>('/admin/stats', true),
  adminBookings: (status?: string) =>
    api
      .get<{ data: BookingDTO[] }>(`/admin/bookings${status ? `?status=${status}` : ''}`, true)
      .then((r) => r.data),
  adminOfferings: () => api.get<{ data: OfferingDTO[] }>('/admin/offerings', true).then((r) => r.data),
  confirmPayment: (paymentId: string) =>
    api.post<BookingDTO>(`/admin/payments/${paymentId}/confirm`, undefined, true),
  setBookingStatus: (id: string, status: string) =>
    api.patch<BookingDTO>(`/admin/bookings/${id}/status`, { status }, true),
};

export interface AdminStats {
  bookingsByStatus: Record<string, number>;
  confirmedRevenue: number;
  upcomingEvents: number;
  activeOfferings: number;
  customers: number;
}
