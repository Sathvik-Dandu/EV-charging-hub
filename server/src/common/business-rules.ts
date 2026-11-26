export const BUSINESS_RULES = {
  MAX_UPCOMING_BOOKINGS: 2,
  NO_SHOW_GRACE_MINUTES: 15,
  ALLOWED_SLOT_DURATIONS: [30, 60, 90, 120],
  MAX_ADVANCE_BOOKING_DAYS: 7,
  CHARGING_EFFICIENCY: 0.92,
  GST_PERCENT: 18,
  MAX_PRICE_PER_KWH: 100,
  CURRENCY: 'INR',
};

export const CONNECTOR_SPECS = {
  CCS2: { label: 'CCS2', current: 'DC', minKw: 50, maxKw: 350, note: 'Fast charger, minimum 50 kW' },
  CHADEMO: { label: 'CHAdeMO', current: 'DC', minKw: 50, maxKw: 150, note: 'Fast charger, minimum 50 kW' },
  TYPE2: { label: 'Type 2 AC', current: 'AC', minKw: 22, maxKw: 43, note: 'AC charger, minimum 22 kW' },
  BHARAT_DC001: { label: 'Bharat DC-001', current: 'DC', minKw: 15, maxKw: 15, note: '15 kW, 48 V and higher-voltage variants' },
  BHARAT_AC001: { label: 'Bharat AC-001', current: 'AC', minKw: 10, maxKw: 10, note: '10 kW total, three 3.3 kW connector guns' },
} as const;

export const ROLES = {
  ADMIN: 'ADMIN',
  EV_OWNER: 'EV_OWNER',
  STATION_OWNER: 'STATION_OWNER',
  TECHNICIAN: 'TECHNICIAN',
  MANAGER: 'MANAGER',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const SELF_SIGNUP_ROLES: RoleName[] = [ROLES.EV_OWNER, ROLES.STATION_OWNER, ROLES.TECHNICIAN];

export const ROLES_NEEDING_APPROVAL: RoleName[] = [ROLES.STATION_OWNER, ROLES.TECHNICIAN];
