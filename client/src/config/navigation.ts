import type { SvgIconComponent } from '@mui/icons-material';
import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined';
import EvStationOutlined from '@mui/icons-material/EvStationOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import BoltOutlined from '@mui/icons-material/BoltOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import DirectionsCarOutlined from '@mui/icons-material/DirectionsCarOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import type { Role } from '../api/types';
import { can, type Permission } from './permissions';

export interface NavItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
  permission: Permission;
  labels?: Partial<Record<Role, string>>;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/dashboard', icon: SpaceDashboardOutlined, permission: 'overview:view' },
  { label: 'Account requests', path: '/approvals', icon: HowToRegOutlined, permission: 'accounts:approve' },
  { label: 'Stations', path: '/stations', icon: EvStationOutlined, permission: 'stations:view', labels: { STATION_OWNER: 'My stations' } },
  { label: 'My vehicles', path: '/vehicles', icon: DirectionsCarOutlined, permission: 'vehicles:manage' },
  { label: 'Bookings', path: '/bookings', icon: EventAvailableOutlined, permission: 'bookings:view' },
  { label: 'Charging sessions', path: '/sessions', icon: BoltOutlined, permission: 'sessions:view' },
  { label: 'Invoices', path: '/invoices', icon: ReceiptLongOutlined, permission: 'invoices:view' },
  { label: 'Maintenance', path: '/maintenance', icon: BuildOutlined, permission: 'tickets:view', labels: { TECHNICIAN: 'My work queue' } },
  { label: 'Reports', path: '/reports', icon: TableChartOutlined, permission: 'reports:view' },
  { label: 'Help & support', path: '/enquiries', icon: ForumOutlined, permission: 'enquiries:view', labels: { MANAGER: 'Enquiries' } },
  { label: 'Users', path: '/users', icon: GroupOutlined, permission: 'users:manage' },
];

export const navLabel = (item: NavItem, role: Role) => item.labels?.[role] ?? item.label;

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Network Administrator',
  EV_OWNER: 'EV Owner',
  STATION_OWNER: 'Station Owner',
  TECHNICIAN: 'Maintenance Technician',
  MANAGER: 'Operations Manager',
};

export function canOpen(role: Role, path: string) {
  const item = NAV_ITEMS.find((i) => path.startsWith(i.path));
  return !item || can(role, item.permission);
}
