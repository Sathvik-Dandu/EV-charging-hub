import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { chargerApi, ticketApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { PRIORITIES, ticketSchema } from '../../schemas/forms';
import { label } from '../../utils/format';
import { useNotify } from '../common/Notifier';

export default function ReportFaultDialog({ open, onClose, chargerId }: { open: boolean; onClose: () => void; chargerId?: number }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { data: chargers = [] } = useQuery({ queryKey: ['chargers'], queryFn: chargerApi.list, enabled: open });
  const { register, handleSubmit, reset, watch, formState } = useForm({
    resolver: zodResolver(ticketSchema),
    mode: 'onChange',
    defaultValues: { chargerId: '', title: '', description: '', priority: 'MEDIUM' as const },
  });
  const { errors } = formState;

  useEffect(() => {
    if (open) reset({ chargerId: chargerId ? String(chargerId) : '', title: '', description: '', priority: 'MEDIUM' });
  }, [open, chargerId, reset]);

  const mutation = useMutation({
    mutationFn: ticketApi.create,
    onSuccess: (t) => {
      notify(`Fault ticket ${t.ticketNo} raised. Charger marked faulty.`, 'warning');
      queryClient.invalidateQueries();
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Report a charger fault</DialogTitle>
      <Box component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {mutation.isError && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
            <Alert severity="info">The charger will be marked Faulty and its upcoming bookings will be cancelled.</Alert>
            <TextField select label="Charger" {...register('chargerId')} value={watch('chargerId')} error={!!errors.chargerId} helperText={errors.chargerId?.message}>
              {chargers.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.code} · {c.station?.name} · {label(c.status)}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Title" {...register('title')} error={!!errors.title} helperText={errors.title?.message} />
            <TextField label="Description" multiline minRows={3} {...register('description')} error={!!errors.description} helperText={errors.description?.message} />
            <TextField select label="Priority" {...register('priority')} value={watch('priority')}>
              {PRIORITIES.map((p) => (
                <MenuItem key={p} value={p}>
                  {label(p)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="error" disabled={mutation.isPending}>
            Raise ticket
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
