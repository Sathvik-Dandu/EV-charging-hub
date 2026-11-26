import { Link as RouterLink } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import EvStationOutlined from '@mui/icons-material/EvStationOutlined';
import ElectricalServicesOutlined from '@mui/icons-material/ElectricalServicesOutlined';
import BoltOutlined from '@mui/icons-material/BoltOutlined';
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import DirectionsCarOutlined from '@mui/icons-material/DirectionsCarOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined';
import { useAppSelector } from '../app/store';
import { overviewApi } from '../api/endpoints';
import type { Overview, Role } from '../api/types';
import StatCard from '../components/common/StatCard';
import LiveChargerGrid from './dashboard/LiveChargerGrid';
import LiveFeed from './dashboard/LiveFeed';
import { brand } from '../theme/palette';

const QUICK_ACTIONS: Record<Role, { label: string; to: string }[]> = {
  ADMIN: [
    { label: 'Review account requests', to: '/approvals' },
    { label: 'Add a tariff', to: '/tariffs' },
    { label: 'Manage users', to: '/users' },
  ],
  EV_OWNER: [
    { label: 'Add a vehicle', to: '/vehicles' },
    { label: 'Book a charging slot', to: '/stations' },
    { label: 'View invoices', to: '/invoices' },
  ],
  STATION_OWNER: [
    { label: 'Add a station', to: '/stations' },
    { label: 'Bookings at my stations', to: '/bookings' },
    { label: 'Live sessions', to: '/sessions' },
  ],
  TECHNICIAN: [{ label: 'My work queue', to: '/maintenance' }],
  MANAGER: [
    { label: 'Assign maintenance', to: '/maintenance' },
    { label: 'Answer enquiries', to: '/enquiries' },
    { label: 'Open reports', to: '/reports' },
  ],
};

function cardsFor(role: Role, o?: Overview) {
  const v = (n?: number) => (o ? n : '–');
  const network = [
    { title: role === 'STATION_OWNER' ? 'My stations' : 'Active stations', value: v(o?.stations), icon: <EvStationOutlined /> },
    { title: 'Chargers available', value: o ? `${o.statusCounts.AVAILABLE} / ${o.chargers}` : '–', icon: <ElectricalServicesOutlined /> },
  ];
  switch (role) {
    case 'EV_OWNER':
      return [
        { title: 'My vehicles', value: v(o?.myVehicles), icon: <DirectionsCarOutlined /> },
        { title: 'Upcoming bookings', value: o ? `${o.myUpcoming} / 2` : '–', icon: <EventAvailableOutlined />, caption: 'Maximum 2 at a time' },
        { title: 'Charging now', value: v(o?.activeSessions), icon: <BoltOutlined /> },
        { title: 'Unpaid invoices', value: v(o?.myPending), icon: <ReceiptLongOutlined /> },
      ];
    case 'TECHNICIAN':
      return [{ title: 'My open tickets', value: v(o?.openTickets), icon: <ReportProblemOutlined /> }];
    case 'ADMIN':
      return [{ title: 'Pending account requests', value: v(o?.pendingApprovals), icon: <HowToRegOutlined /> }, ...network];
    case 'STATION_OWNER':
      return [
        ...network,
        { title: 'Charging now', value: v(o?.activeSessions), icon: <BoltOutlined /> },
        { title: "Today's bookings", value: v(o?.todayBookings), icon: <EventAvailableOutlined /> },
        { title: 'Open faults', value: v(o?.openTickets), icon: <ReportProblemOutlined /> },
      ];
    case 'MANAGER':
      return [
        ...network,
        { title: 'Charging now', value: v(o?.activeSessions), icon: <BoltOutlined /> },
        { title: 'Open faults', value: v(o?.openTickets), icon: <ReportProblemOutlined /> },
        { title: "Today's bookings", value: v(o?.todayBookings), icon: <EventAvailableOutlined /> },
        { title: 'Open enquiries', value: v(o?.openEnquiries), icon: <ForumOutlined /> },
      ];
  }
}

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user)!;
  const { data } = useQuery({ queryKey: ['overview'], queryFn: overviewApi.get, refetchInterval: 30_000 });
  const cards = cardsFor(user.role, data);
  const staff = ['ADMIN', 'STATION_OWNER', 'MANAGER'].includes(user.role);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: 30, md: 40 } }}>
          {greeting}, {user.fullName.split(' ')[0]}
        </Typography>
        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', mt: 2 }}>
          {QUICK_ACTIONS[user.role].map((a) => (
            <Button key={a.to + a.label} component={RouterLink} to={a.to} variant="outlined">
              {a.label}
            </Button>
          ))}
        </Stack>
      </Box>

      <Grid container spacing={2}>
        {cards.map((c) => (
          <Grid key={c.title} size={{ xs: 12, sm: 6, md: 4, xl: cards.length > 4 ? 2 : 3 }}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      {data && data.stations === 0 && (user.role === 'ADMIN' || user.role === 'STATION_OWNER') && (
        <Box sx={{ mt: 3, p: 3, borderRadius: 4, bgcolor: brand.mist }}>
          <Typography variant="h6">No stations yet</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {user.role === 'ADMIN'
              ? 'Create a tariff first. Approved station owners can then add their stations (you can add stations too).'
              : 'Open My stations and click "Add station". Then add chargers to it so drivers can book.'}
          </Typography>
        </Box>
      )}

      {staff && (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <LiveChargerGrid />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <LiveFeed />
          </Grid>
        </Grid>
      )}
    </>
  );
}
