import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tab, Tabs, TextField } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { userApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import type { ApprovalStatus, UserRow } from '../api/types';
import { ROLE_LABELS } from '../config/navigation';
import { dateTime, label } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import StatusChip from '../components/common/StatusChip';
import { useNotify } from '../components/common/Notifier';

const TABS: ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export default function ApprovalsPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ApprovalStatus>('PENDING');
  const [rejecting, setRejecting] = useState<UserRow | null>(null);
  const [reason, setReason] = useState('');
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['account-requests'], queryFn: userApi.requests });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['account-requests'] });
    queryClient.invalidateQueries({ queryKey: ['overview'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const approve = useMutation({
    mutationFn: (u: UserRow) => userApi.approve(u.id),
    onSuccess: (u) => {
      notify(`${u.fullName} approved. They can sign in now.`);
      refresh();
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  const reject = useMutation({
    mutationFn: () => userApi.reject(rejecting!.id, reason),
    onSuccess: (u) => {
      notify(`${u.fullName}'s request was rejected`, 'warning');
      setRejecting(null);
      setReason('');
      refresh();
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  const columns: GridColDef<UserRow>[] = [
    { field: 'createdAt', headerName: 'Requested', width: 190, valueFormatter: (v) => dateTime(v) },
    { field: 'fullName', headerName: 'Name', width: 160 },
    { field: 'role', headerName: 'Wants to be', width: 190, valueGetter: (_, r) => ROLE_LABELS[r.role.name] },
    { field: 'organization', headerName: 'Business / company', flex: 1, minWidth: 180, valueGetter: (_, r) => r.organization ?? '—' },
    { field: 'email', headerName: 'Email', width: 210 },
    { field: 'phone', headerName: 'Phone', width: 120 },
    {
      field: 'approvalStatus',
      headerName: 'Status',
      width: 130,
      renderCell: ({ row }) => <StatusChip kind="approval" value={row.approvalStatus} />,
    },
    ...(tab === 'REJECTED' ? [{ field: 'rejectionReason', headerName: 'Reason', width: 220 } as GridColDef<UserRow>] : []),
    ...(tab === 'PENDING'
      ? [
          {
            field: 'actions',
            headerName: 'Decision',
            width: 200,
            sortable: false,
            renderCell: ({ row }) => (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
                <Button size="small" variant="contained" color="secondary" sx={{ color: 'primary.main' }} onClick={() => approve.mutate(row)}>
                  Approve
                </Button>
                <Button size="small" color="error" onClick={() => setRejecting(row)}>
                  Reject
                </Button>
              </Stack>
            ),
          } as GridColDef<UserRow>,
        ]
      : []),
  ];

  const rows = requests.filter((r) => r.approvalStatus === tab);

  return (
    <>
      <PageHeader title="Account requests" subtitle="Station owners and technicians who signed up wait here until you approve them" />
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          {TABS.map((t) => (
            <Tab key={t} value={t} label={`${label(t)} (${requests.filter((r) => r.approvalStatus === t).length})`} />
          ))}
        </Tabs>
        <Box sx={{ height: 520 }}>
          <DataGrid rows={rows} columns={columns} loading={isLoading} disableRowSelectionOnClick sx={{ border: 0 }} />
        </Box>
      </Card>
      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} fullWidth maxWidth="xs">
        <DialogTitle>Reject {rejecting?.fullName}?</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Reason (shown to the user when they try to sign in)"
            multiline
            minRows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={reason.length > 0 && reason.trim().length < 5}
            helperText={reason.length > 0 && reason.trim().length < 5 ? 'At least 5 characters' : ' '}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={reason.trim().length < 5 || reject.isPending} onClick={() => reject.mutate()}>
            Reject request
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
