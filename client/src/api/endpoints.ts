import { api } from './client';
import type {
  AuthResponse,
  Booking,
  Charger,
  ChargingSession,
  ConnectorType,
  Enquiry,
  EnquiryCategory,
  EnquiryStatus,
  Invoice,
  RegisterResponse,
  Overview,
  Station,
  Ticket,
  UserRow,
  Vehicle,
} from './types';

const get = <T>(url: string, params?: object) => api.get<T>(url, { params }).then((r) => r.data);
const post = <T>(url: string, body?: object) => api.post<T>(url, body).then((r) => r.data);
const patch = <T>(url: string, body?: object) => api.patch<T>(url, body).then((r) => r.data);
const put = <T>(url: string, body?: object) => api.put<T>(url, body).then((r) => r.data);

export const authApi = {
  login: (body: { email: string; password: string }) => post<AuthResponse>('/auth/login', body),
  register: (body: { fullName: string; email: string; phone?: string; password: string; role: string; organization?: string }) =>
    post<RegisterResponse>('/auth/register', body),
  logout: () => post('/auth/logout'),
};

export const stationApi = {
  search: (params: { city?: string; connector?: ConnectorType | ''; available?: boolean; manage?: boolean }) =>
    get<Station[]>('/stations', {
      ...params,
      city: params.city || undefined,
      connector: params.connector || undefined,
      available: params.available || undefined,
      manage: params.manage || undefined,
    }),
  cities: () => get<string[]>('/stations/cities'),
  create: (body: object) => post<Station>('/stations', body),
  update: (id: number, body: object) => patch<Station>(`/stations/${id}`, body),
  setPrices: (id: number, body: object) => put<Station>(`/stations/${id}/prices`, body),
};

export const chargerApi = {
  list: () => get<Charger[]>('/chargers'),
  create: (body: object) => post<Charger>('/chargers', body),
  setActive: (id: number, isActive: boolean) => patch<Charger>(`/chargers/${id}/active`, { isActive }),
  slots: (id: number, date: string) =>
    get<{ charger: Charger; bookings: { startTime: string; endTime: string }[] }>(`/chargers/${id}/slots`, { date }),
};

export const vehicleApi = {
  mine: () => get<Vehicle[]>('/vehicles'),
  create: (body: object) => post<Vehicle>('/vehicles', body),
  remove: (id: number) => api.delete(`/vehicles/${id}`).then((r) => r.data),
};

export const bookingApi = {
  list: (status?: string) => get<Booking[]>('/bookings', { status }),
  create: (body: { vehicleId: number; chargerId: number; startTime: string; durationMinutes: number }) =>
    post<Booking>('/bookings', body),
  reschedule: (id: number, body: { startTime: string; durationMinutes: number }) =>
    patch<Booking>(`/bookings/${id}/reschedule`, body),
  cancel: (id: number, reason?: string) => patch<Booking>(`/bookings/${id}/cancel`, { reason }),
};

export const sessionApi = {
  list: (status?: 'ACTIVE' | 'COMPLETED') => get<ChargingSession[]>('/sessions', { status }),
  start: (body: { bookingReference?: string; chargerId?: number; vehicleId?: number }) =>
    post<ChargingSession>('/sessions/start', body),
  stop: (id: number, idleMinutes: number) => post<ChargingSession>(`/sessions/${id}/stop`, { idleMinutes }),
};

export const invoiceApi = {
  list: () => get<Invoice[]>('/invoices'),
  pay: (id: number, method: string) => post<Invoice>(`/invoices/${id}/pay`, { method }),
};

export const ticketApi = {
  list: () => get<Ticket[]>('/maintenance'),
  create: (body: object) => post<Ticket>('/maintenance', body),
  assign: (id: number, technicianId: number) => patch<Ticket>(`/maintenance/${id}/assign`, { technicianId }),
  updateStatus: (id: number, body: { status: string; resolution?: string }) =>
    patch<Ticket>(`/maintenance/${id}/status`, body),
};

export const userApi = {
  list: () => get<UserRow[]>('/users'),
  technicians: () => get<{ id: number; fullName: string }[]>('/users/technicians'),
  create: (body: object) => post<UserRow>('/users', body),
  setStatus: (id: number, isActive: boolean) => patch<UserRow>(`/users/${id}/status`, { isActive }),
  setRole: (id: number, role: string) => patch<UserRow>(`/users/${id}/role`, { role }),
  requests: () => get<UserRow[]>('/users/requests'),
  approve: (id: number) => patch<UserRow>(`/users/${id}/approve`),
  reject: (id: number, reason: string) => patch<UserRow>(`/users/${id}/reject`, { reason }),
};

export const overviewApi = {
  get: () => get<Overview>('/overview'),
};

export const enquiryApi = {
  create: (body: { category: EnquiryCategory; subject: string; message: string }) => post<Enquiry>('/enquiries', body),
  list: () => get<Enquiry[]>('/enquiries'),
  reply: (id: number, body: { status: EnquiryStatus; reply?: string }) => patch<Enquiry>(`/enquiries/${id}`, body),
};

export const reportApi = {
  utilization: (days: number) =>
    get<{ code: string; station: string; city: string; chargers: number; sessions: number; chargingHours: number; utilization: number }[]>(
      '/reports/utilization',
      { days },
    ),
  utilizationByHour: (days: number) => get<{ hour: string; utilization: number }[]>('/reports/utilization-by-hour', { days }),
  revenue: (days: number) =>
    get<{ code: string; station: string; sessions: number; energy: number; revenue: number; paid: number }[]>('/reports/revenue', { days }),
  faults: () =>
    get<{ ticketNo: string; charger: string; station: string; title: string; status: string; technician: string | null; downtimeHours: number }[]>(
      '/reports/faults',
    ),
  bookings: (days: number) => get<Record<string, number>>('/reports/bookings', { days }),
};
