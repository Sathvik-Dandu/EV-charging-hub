import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddRounded from '@mui/icons-material/AddRounded';
import { useAppSelector } from '../app/store';
import { enquiryApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import type { Enquiry, EnquiryStatus } from '../api/types';
import { can } from '../config/permissions';
import { ROLE_LABELS } from '../config/navigation';
import { ENQUIRY_CATEGORIES, enquirySchema, type EnquiryForm } from '../schemas/forms';
import { dateTime, label } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import StatusChip from '../components/common/StatusChip';
import { useNotify } from '../components/common/Notifier';
import { brand } from '../theme/palette';

const STATUSES: EnquiryStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED'];

export default function EnquiriesPage() {
  const role = useAppSelector((s) => s.auth.user!.role);
  return can(role, 'enquiries:manage') ? <ManagerEnquiries /> : <MySupport />;
}

function MySupport() {
  const [open, setOpen] = useState(false);
  const { data: enquiries = [] } = useQuery({ queryKey: ['enquiries'], queryFn: enquiryApi.list });

  return (
    <>
      <PageHeader
        title="Help & support"
        subtitle="Ask about bookings, billing, chargers or your account. The operations manager replies here."
        action={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setOpen(true)}>
            New request
          </Button>
        }
      />
      {enquiries.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, borderRadius: 5, bgcolor: brand.mist }}>
          <Typography variant="h6">No requests yet</Typography>
          <Typography color="text.secondary">Click "New request" if you need help.</Typography>
        </Box>
      )}
      <Grid container spacing={2}>
        {enquiries.map((e) => (
          <Grid key={e.id} size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {label(e.category)} · {dateTime(e.createdAt)}
                    </Typography>
                    <Typography variant="h6">{e.subject}</Typography>
                  </Box>
                  <StatusChip kind="enquiry" value={e.status} />
                </Stack>
                <Typography color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                  {e.message}
                </Typography>
                {e.reply ? (
                  <Box sx={{ mt: 2, p: 2, borderRadius: 3, bgcolor: brand.mist }}>
                    <Typography variant="subtitle2">Reply from the operations manager</Typography>
                    <Typography sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{e.reply}</Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ mt: 2, color: brand.warning }}>
                    Waiting for a reply
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <NewRequestDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function NewRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState } = useForm<EnquiryForm>({
    resolver: zodResolver(enquirySchema),
    mode: 'onChange',
    defaultValues: { category: 'BOOKING', subject: '', message: '' },
  });
  const { errors } = formState;
  const message = watch('message') ?? '';

  const mutation = useMutation({
    mutationFn: enquiryApi.create,
    onSuccess: () => {
      notify('Request sent to the operations manager');
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      reset();
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New support request</DialogTitle>
      <Box component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {mutation.isError && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
            <TextField select label="Topic" {...register('category')} value={watch('category')}>
              {ENQUIRY_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {label(c)}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Subject" {...register('subject')} error={!!errors.subject} helperText={errors.subject?.message} />
            <TextField
              label="Message"
              multiline
              minRows={4}
              {...register('message')}
              error={!!errors.message}
              helperText={errors.message?.message ?? `${message.length}/1000`}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            Send
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function ManagerEnquiries() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<EnquiryStatus | 'ALL'>('NEW');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState<EnquiryStatus>('IN_PROGRESS');
  const { data: enquiries = [], isLoading } = useQuery({ queryKey: ['enquiries'], queryFn: enquiryApi.list });

  const save = useMutation({
    mutationFn: () => enquiryApi.reply(selected!.id, { status, reply: reply.trim() || undefined }),
    onSuccess: (e) => {
      notify(`Reply saved, enquiry marked ${label(e.status)}`);
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      setSelected(null);
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  const openEnquiry = (e: Enquiry) => {
    setSelected(e);
    setReply(e.reply ?? '');
    setStatus(e.status === 'NEW' ? 'IN_PROGRESS' : e.status);
  };

  const rows = tab === 'ALL' ? enquiries : enquiries.filter((e) => e.status === tab);
  const columns: GridColDef<Enquiry>[] = [
    { field: 'createdAt', headerName: 'Received', width: 180, valueFormatter: (v) => dateTime(v) },
    { field: 'from', headerName: 'From', width: 170, valueGetter: (_, r) => r.user.fullName },
    { field: 'role', headerName: 'Role', width: 160, valueGetter: (_, r) => ROLE_LABELS[r.user.role.name] },
    { field: 'category', headerName: 'Topic', width: 110, valueFormatter: (v) => label(v) },
    { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 200 },
    { field: 'status', headerName: 'Status', width: 130, renderCell: ({ value }) => <StatusChip kind="enquiry" value={value} /> },
  ];

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Support requests from EV owners, station owners and technicians. Click a row to reply." />
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          {[...STATUSES, 'ALL' as const].map((s) => (
            <Tab key={s} value={s} label={`${label(s)} (${s === 'ALL' ? enquiries.length : enquiries.filter((e) => e.status === s).length})`} />
          ))}
        </Tabs>
        <Box sx={{ height: 540 }}>
          <DataGrid rows={rows} columns={columns} loading={isLoading} onRowClick={({ row }) => openEnquiry(row)} disableRowSelectionOnClick sx={{ border: 0, '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
        </Box>
      </Card>
      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        {selected && (
          <>
            <DialogTitle>
              {selected.subject}
              <Typography variant="body2" color="text.secondary">
                {selected.user.fullName} ({ROLE_LABELS[selected.user.role.name]}) · {selected.user.email} · {label(selected.category)}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Typography sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>{selected.message}</Typography>
              <Stack spacing={2}>
                <TextField label="Your reply" multiline minRows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
                <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value as EnquiryStatus)}>
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {label(s)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setSelected(null)}>Close</Button>
              <Button variant="contained" disabled={save.isPending || (reply.trim().length > 0 && reply.trim().length < 5)} onClick={() => save.mutate()}>
                Save
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
