import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddRounded from '@mui/icons-material/AddRounded';
import { useAppSelector } from '../app/store';
import { can } from '../config/permissions';
import { ticketApi, userApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import type { Ticket } from '../api/types';
import { dateTime } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import StatusChip from '../components/common/StatusChip';
import ReportFaultDialog from '../components/dialogs/ReportFaultDialog';
import { useNotify } from '../components/common/Notifier';

const NEXT_STATUS: Record<string, string | null> = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED', RESOLVED: null };

export default function MaintenancePage() {
  const role = useAppSelector((s) => s.auth.user!.role);
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('ACTIVE');
  const [reportOpen, setReportOpen] = useState(false);
  const [assigning, setAssigning] = useState<Ticket | null>(null);
  const [resolving, setResolving] = useState<Ticket | null>(null);
  const { data: tickets = [], isLoading } = useQuery({ queryKey: ['tickets'], queryFn: ticketApi.list });

  const canAssign = can(role, 'tickets:assign');
  const canWork = can(role, 'tickets:work');
  const canReport = can(role, 'tickets:create');

  const startWork = useMutation({
    mutationFn: (id: number) => ticketApi.updateStatus(id, { status: 'IN_PROGRESS' }),
    onSuccess: () => {
      notify('Ticket moved to In Progress');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  const rows = tickets.filter((t) => (tab === 'ACTIVE' ? t.status !== 'RESOLVED' : t.status === 'RESOLVED'));

  const columns: GridColDef<Ticket>[] = [
    { field: 'ticketNo', headerName: 'Ticket', width: 150, cellClassName: 'mono' },
    { field: 'title', headerName: 'Fault', flex: 1, minWidth: 200 },
    { field: 'charger', headerName: 'Charger', width: 130, valueGetter: (_, r) => r.charger.code },
    { field: 'station', headerName: 'Station', width: 200, valueGetter: (_, r) => r.charger.station.name },
    { field: 'priority', headerName: 'Priority', width: 110, renderCell: ({ value }) => <StatusChip kind="priority" value={value} /> },
    { field: 'status', headerName: 'Status', width: 130, renderCell: ({ value }) => <StatusChip kind="ticket" value={value} /> },
    { field: 'assignedTo', headerName: 'Technician', width: 150, valueGetter: (_, r) => r.assignedTo?.fullName ?? 'Unassigned' },
    { field: 'createdAt', headerName: 'Reported', width: 190, valueFormatter: (v) => dateTime(v) },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 210,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          {canAssign && row.status !== 'RESOLVED' && (
            <Button size="small" onClick={() => setAssigning(row)}>
              {row.assignedTo ? 'Reassign' : 'Assign'}
            </Button>
          )}
          {canWork && row.assignedTo && NEXT_STATUS[row.status] === 'IN_PROGRESS' && (
            <Button size="small" variant="contained" onClick={() => startWork.mutate(row.id)}>
              Start work
            </Button>
          )}
          {canWork && NEXT_STATUS[row.status] === 'RESOLVED' && (
            <Button size="small" variant="contained" color="success" onClick={() => setResolving(row)}>
              Resolve
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle="Track charger faults from Open → In Progress → Resolved. Resolving reactivates the charger."
        action={
          canReport && (
            <Button variant="contained" color="error" startIcon={<AddRounded />} onClick={() => setReportOpen(true)}>
              Report fault
            </Button>
          )
        }
      />
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="ACTIVE" label={`Active (${tickets.filter((t) => t.status !== 'RESOLVED').length})`} />
          <Tab value="RESOLVED" label={`Resolved (${tickets.filter((t) => t.status === 'RESOLVED').length})`} />
        </Tabs>
        <Box sx={{ height: 560 }}>
          <DataGrid rows={rows} columns={columns} loading={isLoading} disableRowSelectionOnClick sx={{ border: 0 }} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[10, 25]} />
        </Box>
      </Card>
      <ReportFaultDialog open={reportOpen} onClose={() => setReportOpen(false)} />
      <AssignDialog ticket={assigning} onClose={() => setAssigning(null)} />
      <ResolveDialog ticket={resolving} onClose={() => setResolving(null)} />
    </>
  );
}

function AssignDialog({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [technicianId, setTechnicianId] = useState('');
  const { data: techs = [] } = useQuery({ queryKey: ['technicians'], queryFn: userApi.technicians, enabled: !!ticket });
  const mutation = useMutation({
    mutationFn: () => ticketApi.assign(ticket!.id, Number(technicianId)),
    onSuccess: () => {
      notify('Technician assigned');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onClose();
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  return (
    <Dialog open={!!ticket} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Assign {ticket?.ticketNo}</DialogTitle>
      <DialogContent dividers>
        <TextField select label="Technician" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
          {techs.map((t) => (
            <MenuItem key={t.id} value={String(t.id)}>
              {t.fullName}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!technicianId || mutation.isPending} onClick={() => mutation.mutate()}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ResolveDialog({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [resolution, setResolution] = useState('');
  const mutation = useMutation({
    mutationFn: () => ticketApi.updateStatus(ticket!.id, { status: 'RESOLVED', resolution }),
    onSuccess: () => {
      notify('Ticket resolved. Charger is available again.');
      queryClient.invalidateQueries();
      setResolution('');
      onClose();
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  return (
    <Dialog open={!!ticket} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Resolve {ticket?.ticketNo}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {ticket?.title} on {ticket?.charger.code}: {ticket?.description}
        </Typography>
        <TextField
          label="Resolution notes"
          multiline
          minRows={3}
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          helperText="Minimum 5 characters"
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="success" disabled={resolution.trim().length < 5 || mutation.isPending} onClick={() => mutation.mutate()}>
          Mark resolved
        </Button>
      </DialogActions>
    </Dialog>
  );
}
