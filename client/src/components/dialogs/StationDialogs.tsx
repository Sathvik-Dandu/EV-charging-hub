import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { chargerApi, stationApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { CONNECTORS, chargerSchema, pricesSchema, stationSchema } from '../../schemas/forms';
import { CONNECTOR_SPECS, connectorLabel } from '../../config/connectors';
import { priceFor } from '../../utils/prices';
import { useNotify } from '../common/Notifier';
import type { ConnectorType, Station } from '../../api/types';

const rupee = { input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } };

export function AddStationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState } = useForm({
    resolver: zodResolver(stationSchema),
    mode: 'onChange',
    defaultValues: { code: '', name: '', address: '', city: '', latitude: '', longitude: '', opensAt: '00:00', closesAt: '23:59' },
  });
  const { errors } = formState;

  const mutation = useMutation({
    mutationFn: stationApi.create,
    onSuccess: (s) => {
      notify(`Station ${s.code} added. Now add chargers and their prices.`);
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
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>{field('code', 'Station ID', { placeholder: 'BLR-005' })}</Grid>
            <Grid size={{ xs: 12, sm: 8 }}>{field('name', 'Station name')}</Grid>
            <Grid size={12}>{field('address', 'Address')}</Grid>
            <Grid size={{ xs: 12, sm: 4 }}>{field('city', 'City')}</Grid>
            <Grid size={{ xs: 6, sm: 4 }}>{field('latitude', 'Latitude')}</Grid>
            <Grid size={{ xs: 6, sm: 4 }}>{field('longitude', 'Longitude')}</Grid>
            <Grid size={{ xs: 6, sm: 6 }}>{field('opensAt', 'Opens at', { type: 'time', slotProps: { inputLabel: { shrink: true } } })}</Grid>
            <Grid size={{ xs: 6, sm: 6 }}>{field('closesAt', 'Closes at', { type: 'time', slotProps: { inputLabel: { shrink: true } } })}</Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            You set the price per kWh for each charging type when you add a charger.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
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
  const pricedTypes = station?.prices.map((p) => p.connectorType) ?? [];
  const { register, handleSubmit, reset, watch, formState } = useForm({
    resolver: zodResolver(chargerSchema(pricedTypes)),
    mode: 'onChange',
    defaultValues: { code: '', connectorType: 'CCS2' as const, powerKw: '60', pricePerKwh: '' },
  });
  const { errors } = formState;
  const type = watch('connectorType');
  const existing = station ? priceFor(station, type) : undefined;

  const mutation = useMutation({
    mutationFn: ({ pricePerKwh, ...v }: { code: string; connectorType: string; powerKw: number; pricePerKwh: string }) =>
      chargerApi.create({ ...v, stationId: station!.id, ...(!existing && { pricePerKwh: Number(pricePerKwh) }) }),
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
              label="Charging type"
              {...register('connectorType', { deps: ['powerKw', 'pricePerKwh'] })}
              value={type}
              helperText={CONNECTOR_SPECS[type]?.note}
            >
              {CONNECTORS.map((c) => (
                <MenuItem key={c} value={c}>
                  {connectorLabel(c)}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Power rating (kW)" {...register('powerKw')} error={!!errors.powerKw} helperText={errors.powerKw?.message} />
            {existing ? (
              <Alert severity="info">
                {connectorLabel(type)} price at this station: ₹{existing.pricePerKwh}/kWh. Change it with “Prices”.
              </Alert>
            ) : (
              <TextField
                label={`Price per kWh for ${connectorLabel(type)}`}
                {...register('pricePerKwh')}
                error={!!errors.pricePerKwh}
                helperText={errors.pricePerKwh?.message ?? 'Used for every charger of this type at this station'}
                slotProps={rupee}
              />
            )}
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

export function PricesDialog({ station, onClose }: { station: Station; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const typesInUse = [...new Set(station.chargers.map((c) => c.connectorType))];
  const prices = Object.fromEntries(CONNECTORS.map((t) => [t, String(priceFor(station, t)?.pricePerKwh ?? '')])) as Record<ConnectorType, string>;

  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(pricesSchema(typesInUse)),
    mode: 'onChange',
    defaultValues: { prices },
  });
  const { errors } = formState;

  const mutation = useMutation({
    mutationFn: (v: { prices: Partial<Record<ConnectorType, string>> }) =>
      stationApi.setPrices(station.id, {
        prices: CONNECTORS.filter((t) => v.prices[t]).map((t) => ({ connectorType: t, pricePerKwh: Number(v.prices[t]) })),
      }),
    onSuccess: () => {
      notify(`Prices saved for ${station.code}`);
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Prices · {station.code}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {mutation.isError && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
            <Typography variant="body2" color="text.secondary">
              Price per kWh for each charging type. Leave a type empty if you don't offer it.
            </Typography>
            {CONNECTORS.map((t) => (
              <TextField
                key={t}
                label={`${connectorLabel(t)}${typesInUse.includes(t) ? ' (in use)' : ''}`}
                {...register(`prices.${t}`)}
                error={!!errors.prices?.[t]}
                helperText={errors.prices?.[t]?.message}
                slotProps={rupee}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            Save prices
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
