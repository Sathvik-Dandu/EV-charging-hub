import { AuthUser } from './auth.decorators';
import { ROLES } from './business-rules';

const ownStations = (user: AuthUser) => ({ station: { ownerId: user.id } });

export const scope = {
  stations: (user?: AuthUser) => (user?.role === ROLES.STATION_OWNER ? { ownerId: user.id } : {}),

  chargers: (user: AuthUser) => (user.role === ROLES.STATION_OWNER ? ownStations(user) : {}),

  bookings: (user: AuthUser) => {
    if (user.role === ROLES.EV_OWNER) return { userId: user.id };
    if (user.role === ROLES.STATION_OWNER) return { charger: ownStations(user) };
    return {};
  },

  sessions: (user: AuthUser) => {
    if (user.role === ROLES.EV_OWNER) return { vehicle: { ownerId: user.id } };
    if (user.role === ROLES.STATION_OWNER) return { charger: ownStations(user) };
    return {};
  },

  invoices: (user: AuthUser) => {
    if (user.role === ROLES.EV_OWNER) return { session: { vehicle: { ownerId: user.id } } };
    if (user.role === ROLES.STATION_OWNER) return { session: { charger: ownStations(user) } };
    return {};
  },

  tickets: (user: AuthUser) => {
    if (user.role === ROLES.TECHNICIAN) return { assignedToId: user.id };
    if (user.role === ROLES.EV_OWNER) return { reportedById: user.id };
    if (user.role === ROLES.STATION_OWNER) return { charger: ownStations(user) };
    return {};
  },

  enquiries: (user: AuthUser) => (user.role === ROLES.MANAGER ? {} : { userId: user.id }),
};

export function ownsStation(user: AuthUser, station: { ownerId: number | null }) {
  return user.role !== ROLES.STATION_OWNER || station.ownerId === user.id;
}
