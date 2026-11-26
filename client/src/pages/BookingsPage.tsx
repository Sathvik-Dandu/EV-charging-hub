import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Tooltip } from '@mui/material';
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import EventRepeatRounded from '@mui/icons-material/EventRepeatRounded';
import CancelRounded from '@mui/icons-material/CancelRounded';
import { useAppSelector } from '../app/store';
import { can } from '../config/permissions';
import { bookingApi, sessionApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import type { Booking } from '../api/types';
import { SLOT_DURATIONS } from '../schemas/forms';
import { dateTime, timeOnly } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import StatusChip from '../components/common/StatusChip';
import { useNotify } from '../components/common/Notifier';

const TABS = ['ALL', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const EARLY_START_MINUTES = 30;

export default function BookingsPage() {
  const role = useAppSelector((s) => s.auth.user!.role);
  const isOwner = role === 'EV_OWNER';
  const notify = useNotify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('ALL');
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);
  const { data: bookings = [], isLoading } = useQuery({ queryKey: ['bookings'], queryFn: () => bookingApi.list() });

  const rows = useMemo(() => (tab === 'ALL' ? bookings : bookings.filter((b) => b.status === tab)), [bookings, tab]);

  const onDone = (message: string) => {
    notify(message);
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };
  const onError = (e: unknown) => notify(errorMessage(e), 'error');

  const cancel = useMutation({ mutationFn: (id: number) => bookingApi.cancel(id), onSuccess: () => onDone('Booking cancelled'), onError });
  const start = useMutation({
    mutationFn: (reference: string) => sessionApi.start({ bookingReference: reference }),
    onSuccess: () => {
      onDone('Charging started!');
      navigate('/sessions');
    },
    onError,
  });

  const canStart = (b: Booking) => b.status === 'CONFIRMED' && dayjs().isAfter(dayjs(b.startTime).subtract(EARLY_START_MINUTES, 'minute'));

  const columns: GridColDef<Booking>[] = [
    { field: 'reference', headerName: 'Reference', width: 160, cellClassName: 'mono' },
    { field: 'station', headerName: 'Station', flex: 1, minWidth: 180, valueGetter: (_, row) => row.charger.station.name },
    { field: 'charger', headerName: 'Charger', width: 130, valueGetter: (_, row) => row.charger.code },
    { field: 'vehicle', headerName: 'Vehicle', width: 130, valueGetter: (_, row) => row.vehicle.registrationNo },
    ...(isOwner ? [] : [{ field: 'user', headerName: 'Customer', width: 150, valueGetter: (_: unknown, row: Booking) => row.user.fullName } as GridColDef<Booking>]),
    {
      field: 'startTime',
      headerName: 'Slot',
      width: 230,
      valueFormatter: (_, row) => `${dateTime(row.startTime)} – ${timeOnly(row.endTime)}`,
    },
    { field: 'status', headerName: 'Status', width: 140, renderCell: ({ value }) => <StatusChip kind="booking" value={value} /> },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 130,
      getActions: ({ row }) => {
        if (row.status !== 'CONFIRMED') return [];
        const actions = [];
        if (can(role, 'sessions:control')) {
          actions.push(
            <GridActionsCellItem
              key="start"
              icon={
                <Tooltip title={canStart(row) ? 'Start charging' : `Available ${EARLY_START_MINUTES} min before slot`}>
                  <PlayArrowRounded color={canStart(row) ? 'primary' : 'disabled'} />
                </Tooltip>
              }
              label="Start"
              disabled={!canStart(row)}
              onClick={() => start.mutate(row.reference)}
            />,
          );
        }
        if (can(role, 'bookings:reschedule')) {
          actions.push(
            <GridActionsCellItem key="reschedule" icon={<Tooltip title="Reschedule"><EventRepeatRounded /></Tooltip>} label="Reschedule" onClick={() => setRescheduling(row)} />,
          );
        }
        if (can(role, 'bookings:cancel')) actions.push(
          <GridActionsCellItem key="cancel" icon={<Tooltip title="Cancel booking"><CancelRounded color="error" /></Tooltip>} label="Cancel" onClick={() => cancel.mutate(row.id)} />,
        );
        return actions;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={isOwner ? 'My bookings' : role === 'STATION_OWNER' ? 'Bookings at my stations' : 'All bookings'}
        subtitle="Reserve, reschedule or cancel slots. Unstarted bookings are auto-released 15 minutes after the slot starts."
        action={
          can(role, 'bookings:create') && (
            <Button variant="contained" onClick={() => navigate('/stations')}>
              Book new slot
            </Button>
          )
        }
      />
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          {TABS.map((t) => (
            <Tab key={t} value={t} label={`${t.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} (${t === 'ALL' ? bookings.length : bookings.filter((b) => b.status === t).length})`} />
          ))}
        </Tabs>
        <Box sx={{ height: 620 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={isLoading}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            pageSizeOptions={[10, 25, 50]}
            sx={{ border: 0 }}
          />
        </Box>
      </Card>
      <RescheduleDialog booking={rescheduling} onClose={() => setRescheduling(null)} />
    </>
  );
}

function RescheduleDialog({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60);

  const mutation = useMutation({
    mutationFn: () => bookingApi.reschedule(booking!.id, { startTime: dayjs(startTime).toISOString(), durationMinutes: duration }),
    onSuccess: () => {
      notify('Booking rescheduled');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  return (
    <Dialog
      open={!!booking}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ transition: { onEnter: () => {
        setStartTime(dayjs(booking?.startTime).format('YYYY-MM-DDTHH:mm'));
        setDuration(dayjs(booking?.endTime).diff(booking?.startTime, 'minute'));
      } } }}
    >
      <DialogTitle>Reschedule {booking?.reference}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            type="datetime-local"
            label="New start time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1800 } }}
          />
          <TextField select label="Duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {SLOT_DURATIONS.map((d) => (
              <MenuItem key={d} value={d}>
                {d} minutes
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending || !startTime}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
