import type { Role } from '../api/types';

const ADMIN: Role = 'ADMIN';
const EV_OWNER: Role = 'EV_OWNER';
const STATION_OWNER: Role = 'STATION_OWNER';
const TECHNICIAN: Role = 'TECHNICIAN';
const MANAGER: Role = 'MANAGER';

export const PERMISSIONS = {
  'overview:view': [ADMIN, EV_OWNER, STATION_OWNER, TECHNICIAN, MANAGER],
  'accounts:approve': [ADMIN],
  'users:manage': [ADMIN],
  'tariffs:manage': [ADMIN],
  'stations:view': [ADMIN, EV_OWNER, STATION_OWNER, MANAGER],
  'stations:create': [ADMIN, STATION_OWNER],
  'stations:edit': [ADMIN, STATION_OWNER],
  'chargers:manage': [ADMIN, STATION_OWNER],
  'vehicles:manage': [EV_OWNER],
  'bookings:view': [EV_OWNER, STATION_OWNER, MANAGER],
  'bookings:create': [EV_OWNER],
  'bookings:reschedule': [EV_OWNER],
  'bookings:cancel': [EV_OWNER, STATION_OWNER],
  'sessions:view': [EV_OWNER, STATION_OWNER, MANAGER],
  'sessions:control': [EV_OWNER, STATION_OWNER],
  'sessions:walkin': [EV_OWNER],
  'invoices:view': [EV_OWNER, STATION_OWNER, MANAGER],
  'invoices:pay': [EV_OWNER],
  'tickets:view': [EV_OWNER, STATION_OWNER, TECHNICIAN, MANAGER],
  'tickets:create': [EV_OWNER, STATION_OWNER],
  'tickets:assign': [MANAGER],
  'tickets:work': [TECHNICIAN],
  'technicians:view': [MANAGER],
  'enquiries:view': [EV_OWNER, STATION_OWNER, TECHNICIAN, MANAGER],
  'enquiries:create': [EV_OWNER, STATION_OWNER, TECHNICIAN],
  'enquiries:manage': [MANAGER],
  'reports:view': [MANAGER],
} satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined, permission: Permission): boolean {
  return !!role && (PERMISSIONS[permission] as Role[]).includes(role);
}
