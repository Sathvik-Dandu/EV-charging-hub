import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Link, MenuItem, Stack, TextField } from '@mui/material';
import { useAppSelector } from '../../app/store';
import { chargerApi, stationApi, tariffApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { chargerSchema, stationSchema } from '../../schemas/forms';
import { CONNECTORS, CONNECTOR_SPECS, connectorLabel } from '../../config/connectors';
import { useNotify } from '../common/Notifier';
import type { Station } from '../../api/types';

export function AddStationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const role = useAppSelector((st) => st.auth.user?.role);
  const { data: allTariffs = [], isFetched } = useQuery({ queryKey: ['tariffs'], queryFn: tariffApi.list, enabled: open });
  const tariffs = allTariffs.filter((t) => t.isActive);
  const noTariffs = isFetched && tariffs.length === 0;
  const { register, handleSubmit, reset, watch, formState } = useForm({
    resolver: zodResolver(stationSchema),
    mode: 'onChange',
    defaultValues: { code: '', name: '', address: '', city: '', latitude: '', longitude: '', opensAt: '00:00', closesAt: '23:59', tariffId: '' },
  });
  const { errors } = formState;

  const mutation = useMutation({
    mutationFn: stationApi.create,
    onSuccess: (s) => {
      notify(`Station ${s.code} added. Now add chargers to it.`);
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      reset();
      onClose();
    },
  });

  const field = (name: 'code' | 'name' | 'address' | 'city' | 'latitude' | 'longitude' | 'opensAt' | 'closesAt', labelText: string, extra = {}) => (
    <TextField label={labelText} {...register(name)} error={!!errors[name]} helperText={errors[name]?.message} {...extra} />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add station</DialogTitle>
      <Box component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogContent dividers>
          {mutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(mutation.error)}</Alert>}
          {noTariffs && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No tariffs exist yet, so a station can't be priced.{' '}
              {role === 'ADMIN' ? (
                <Link component={RouterLink} to="/tariffs" onClick={onClose}>
                  Create a tariff first
                </Link>
              ) : (
                'Ask the administrator to create a tariff first.'
              )}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>{field('code', 'Station ID', { placeholder: 'BLR-005' })}</Grid>
            <Grid size={{ xs: 12, sm: 8 }}>{field('name', 'Station name')}</Grid>
            <Grid size={12}>{field('address', 'Address')}</Grid>
            <Grid size={{ xs: 12, sm: 4 }}>{field('city', 'City')}</Grid>
            <Grid size={{ xs: 6, sm: 4 }}>{field('latitude', 'Latitude')}</Grid>
            <Grid size={{ xs: 6, sm: 4 }}>{field('longitude', 'Longitude')}</Grid>
            <Grid size={{ xs: 6, sm: 4 }}>{field('opensAt', 'Opens at', { type: 'time', slotProps: { inputLabel: { shrink: true } } })}</Grid>
            <Grid size={{ xs: 6, sm: 4 }}>{field('closesAt', 'Closes at', { type: 'time', slotProps: { inputLabel: { shrink: true } } })}</Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Tariff"
                {...register('tariffId')}
                value={watch('tariffId')}
                disabled={noTariffs}
                error={!!errors.tariffId}
                helperText={errors.tariffId?.message ?? (noTariffs ? 'None available' : ' ')}
              >
                {tariffs.map((t) => (
                  <MenuItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending || noTariffs}>
            Save station
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export function AddChargerDialog({ station, onClose }: { station: Station | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState } = useForm({
    resolver: zodResolver(chargerSchema),
    mode: 'onChange',
    defaultValues: { code: '', connectorType: 'CCS2' as const, powerKw: '60' },
  });
  const { errors } = formState;

  const mutation = useMutation({
    mutationFn: (v: { code: string; connectorType: string; powerKw: number }) => chargerApi.create({ ...v, stationId: station!.id }),
    onSuccess: (c) => {
      notify(`Charger ${c.code} registered`);
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['chargers'] });
      reset();
      onClose();
    },
  });

  return (
    <Dialog open={!!station} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add charger to {station?.code}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {mutation.isError && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
            <TextField label="Charger ID" placeholder={`${station?.code}-C${(station?.chargers.length ?? 0) + 1}`} {...register('code')} error={!!errors.code} helperText={errors.code?.message} />
            <TextField
              select
              label="Connector type"
              {...register('connectorType', { deps: ['powerKw'] })}
              value={watch('connectorType')}
              helperText={CONNECTOR_SPECS[watch('connectorType')]?.note}
            >
              {CONNECTORS.map((c) => (
                <MenuItem key={c} value={c}>
                  {connectorLabel(c)}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Power rating (kW)" {...register('powerKw')} error={!!errors.powerKw} helperText={errors.powerKw?.message} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            Save charger
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
