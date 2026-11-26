export type Role = 'ADMIN' | 'EV_OWNER' | 'STATION_OWNER' | 'TECHNICIAN' | 'MANAGER';
export type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';
export type ConnectorType = 'CCS2' | 'CHADEMO' | 'TYPE2' | 'BHARAT_DC001' | 'BHARAT_AC001';
export type ChargerStatus = 'AVAILABLE' | 'RESERVED' | 'CHARGING' | 'FAULTY';
export type BookingStatus = 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface StationPrice {
  id: number;
  connectorType: ConnectorType;
  pricePerKwh: number;
  peakPricePerKwh: number;
}

export interface Charger {
  id: number;
  code: string;
  connectorType: ConnectorType;
  powerKw: number;
  status: ChargerStatus;
  isActive: boolean;
  stationId: number;
  station?: { name: string; code: string; city: string };
}

export interface Station {
  id: number;
  code: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  opensAt: string;
  closesAt: string;
  isActive: boolean;
  peakStartHour: number;
  peakEndHour: number;
  idleFeePerMin: number;
  prices: StationPrice[];
  ownerId: number | null;
  owner?: { fullName: string; organization: string | null } | null;
  chargers: Charger[];
  availableCount: number;
}

export interface Vehicle {
  id: number;
  registrationNo: string;
  make: string;
  model: string;
  connectorType: ConnectorType;
  batteryKwh: number;
}

export interface Booking {
  id: number;
  reference: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  cancelReason: string | null;
  vehicle: Pick<Vehicle, 'registrationNo' | 'make' | 'model' | 'connectorType'>;
  charger: { code: string; connectorType: ConnectorType; powerKw: number; station: { name: string; city: string } };
  user: { fullName: string; email: string };
  session?: { id: number; status: string } | null;
}

export interface Invoice {
  id: number;
  invoiceNo: string;
  offPeakKwh: number;
  peakKwh: number;
  energyCost: number;
  peakCost: number;
  idleFee: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: 'PENDING' | 'PAID';
  paymentRef: string | null;
  paidAt: string | null;
  createdAt: string;
  session?: ChargingSession;
}

export interface ChargingSession {
  id: number;
  startedAt: string;
  endedAt: string | null;
  energyKwh: number;
  durationMin: number;
  idleMinutes: number;
  status: 'ACTIVE' | 'COMPLETED';
  batteryFull?: boolean;
  vehicle: Pick<Vehicle, 'registrationNo' | 'make' | 'model' | 'batteryKwh'>;
  charger: { code: string; powerKw: number; connectorType: ConnectorType; station: { name: string; city: string; idleFeePerMin?: number } };
  booking: { reference: string } | null;
  invoice: Invoice | null;
}

export interface Ticket {
  id: number;
  ticketNo: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  charger: { code: string; status: ChargerStatus; station: { name: string; city: string } };
  reportedBy: { fullName: string };
  assignedTo: { id: number; fullName: string } | null;
}

export interface UserRow {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
  organization: string | null;
  createdAt: string;
  role: { name: Role };
}

export interface Overview {
  stations: number;
  chargers: number;
  statusCounts: Record<ChargerStatus, number>;
  activeSessions: number;
  openTickets: number;
  todayBookings: number;
  openEnquiries: number;
  pendingApprovals: number;
  myVehicles: number;
  myUpcoming: number;
  myPending: number;
}

export type EnquiryCategory = 'BOOKING' | 'BILLING' | 'CHARGER' | 'ACCOUNT' | 'OTHER';
export type EnquiryStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';

export interface Enquiry {
  id: number;
  category: EnquiryCategory;
  subject: string;
  message: string;
  status: EnquiryStatus;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: { fullName: string; email: string; role: { name: Role } };
}

export type RegisterResponse = AuthResponse | { pending: true; message: string };
