import { ROLES, RoleName } from './business-rules';

const { ADMIN, EV_OWNER, STATION_OWNER, TECHNICIAN, MANAGER } = ROLES;

export const PERMISSIONS = {
  'overview:view': [ADMIN, EV_OWNER, STATION_OWNER, TECHNICIAN, MANAGER],
  'accounts:approve': [ADMIN],
  'users:manage': [ADMIN],
  'stations:view': [ADMIN, EV_OWNER, STATION_OWNER, MANAGER],
  'stations:create': [STATION_OWNER],
  'stations:edit': [ADMIN, STATION_OWNER],
  'chargers:add': [STATION_OWNER],
  'chargers:switch': [ADMIN, STATION_OWNER],
  'prices:manage': [STATION_OWNER],
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
} satisfies Record<string, RoleName[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: RoleName, permission: Permission): boolean {
  return (PERMISSIONS[permission] as RoleName[]).includes(role);
}
