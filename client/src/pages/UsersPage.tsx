import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import PersonAddRounded from '@mui/icons-material/PersonAddRounded';
import { userApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import type { Role, UserRow } from '../api/types';
import { useAppSelector } from '../app/store';
import { ROLE_OPTIONS, userSchema } from '../schemas/forms';
import { ROLE_LABELS } from '../config/navigation';
import { dateTime } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import { useNotify } from '../components/common/Notifier';
import PasswordField from '../components/common/PasswordField';
import PhoneField from '../components/common/PhoneField';

export default function UsersPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const me = useAppSelector((s) => s.auth.user!);
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: userApi.list });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => userApi.setRole(id, role),
    onSuccess: (u) => {
      notify(`${u.fullName} is now ${ROLE_LABELS[u.role.name]}. They must log in again.`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  const toggle = useMutation({
    mutationFn: (u: UserRow) => userApi.setStatus(u.id, !u.isActive),
    onSuccess: (u) => {
      notify(`${u.fullName} ${u.isActive ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  const columns: GridColDef<UserRow>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'fullName', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    {
      field: 'role',
      headerName: 'Role',
      width: 230,
      valueGetter: (_, r) => r.role.name,
      renderCell: ({ row }) => (
        <TextField
          select
          variant="standard"
          value={row.role.name}
          disabled={row.id === me.id}
          onChange={(e) => changeRole.mutate({ id: row.id, role: e.target.value as Role })}
          slotProps={{ htmlInput: { 'aria-label': `Role for ${row.fullName}` } }}
          sx={{ mt: 1.25 }}
        >
          {ROLE_OPTIONS.map((r) => (
            <MenuItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </MenuItem>
          ))}
        </TextField>
      ),
    },
    { field: 'createdAt', headerName: 'Joined', width: 190, valueFormatter: (v) => dateTime(v) },
    { field: 'isActive', headerName: 'Active', width: 100, renderCell: ({ row }) => <Switch checked={row.isActive} disabled={row.id === me.id} onChange={() => toggle.mutate(row)} /> },
  ];

  return (
    <>
      <PageHeader
        title="User management"
        subtitle="Create staff accounts, change a user's role, or deactivate an account"
        action={
          <Button variant="contained" startIcon={<PersonAddRounded />} onClick={() => setOpen(true)}>
            Add user
          </Button>
        }
      />
      <Card>
        <Box sx={{ height: 600 }}>
          <DataGrid rows={users} columns={columns} loading={isLoading} disableRowSelectionOnClick sx={{ border: 0 }} />
        </Box>
      </Card>
      <AddUserDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState } = useForm({
    resolver: zodResolver(userSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', phone: '', password: '', role: 'MANAGER' as const },
  });
  const { errors } = formState;
  const mutation = useMutation({
    mutationFn: userApi.create,
    onSuccess: (u) => {
      notify(`User ${u.fullName} created`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      reset();
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add user</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(({ phone, ...v }) => mutation.mutate({ ...v, phone: phone || undefined }))} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {mutation.isError && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
            <TextField label="Full name" {...register('fullName')} error={!!errors.fullName} helperText={errors.fullName?.message} />
            <TextField label="Email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
            <PhoneField label="Phone (optional)" {...register('phone')} error={!!errors.phone} helperText={errors.phone?.message} />
            <PasswordField
              label="Temporary password"
              autoComplete="new-password"
              {...register('password')}
              rulesFor={watch('password') ?? ''}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <TextField select label="Role" {...register('role')} value={watch('role')}>
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            Create user
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
