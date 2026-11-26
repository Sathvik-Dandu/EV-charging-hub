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
    defaultValues: {
      code: '', name: '', address: '', city: '', latitude: '', longitude: '',
      opensAt: '00:00', closesAt: '23:59', peakStartHour: '18', peakEndHour: '22', idleFeePerMin: '5',
    },
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

  type Field = 'code' | 'name' | 'address' | 'city' | 'latitude' | 'longitude' | 'opensAt' | 'closesAt' | 'peakStartHour' | 'peakEndHour' | 'idleFeePerMin';
  const field = (name: Field, labelText: string, extra = {}) => (
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
            <Grid size={12}>
              <Typography variant="subtitle2">Prices</Typography>
              <Typography variant="caption" color="text.secondary">
                You set the price per kWh for each charging type when you add a charger.
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>{field('peakStartHour', 'Peak hours from', { type: 'number' })}</Grid>
            <Grid size={{ xs: 6, sm: 4 }}>{field('peakEndHour', 'Peak hours to', { type: 'number' })}</Grid>
            <Grid size={{ xs: 12, sm: 4 }}>{field('idleFeePerMin', 'Idle fee per minute', { slotProps: rupee })}</Grid>
          </Grid>
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
    defaultValues: { code: '', connectorType: 'CCS2' as const, powerKw: '60', pricePerKwh: '', peakPricePerKwh: '' },
  });
  const { errors } = formState;
  const type = watch('connectorType');
  const existing = station ? priceFor(station, type) : undefined;

  const mutation = useMutation({
    mutationFn: ({ pricePerKwh, peakPricePerKwh, ...v }: { code: string; connectorType: string; powerKw: number; pricePerKwh: string; peakPricePerKwh: string }) =>
      chargerApi.create({
        ...v,
        stationId: station!.id,
        ...(!existing && { pricePerKwh: Number(pricePerKwh), peakPricePerKwh: Number(peakPricePerKwh) }),
      }),
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
              {...register('connectorType', { deps: ['powerKw', 'pricePerKwh', 'peakPricePerKwh'] })}
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
                {connectorLabel(type)} price at this station: ₹{existing.pricePerKwh}/kWh, peak ₹{existing.peakPricePerKwh}/kWh. Change it with “Prices”.
              </Alert>
            ) : (
              <>
                <Typography variant="subtitle2">Price for {connectorLabel(type)}</Typography>
                <Stack direction="row" spacing={2}>
                  <TextField label="Price per kWh" {...register('pricePerKwh', { deps: ['peakPricePerKwh'] })} error={!!errors.pricePerKwh} helperText={errors.pricePerKwh?.message} slotProps={rupee} />
                  <TextField label="Peak price per kWh" {...register('peakPricePerKwh')} error={!!errors.peakPricePerKwh} helperText={errors.peakPricePerKwh?.message} slotProps={rupee} />
                </Stack>
              </>
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
  const rates = Object.fromEntries(
    CONNECTORS.map((t) => {
      const p = priceFor(station, t);
      return [t, { pricePerKwh: p ? String(p.pricePerKwh) : '', peakPricePerKwh: p ? String(p.peakPricePerKwh) : '' }];
    }),
  ) as Record<ConnectorType, { pricePerKwh: string; peakPricePerKwh: string }>;

  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(pricesSchema(typesInUse)),
    mode: 'onChange',
    defaultValues: {
      peakStartHour: String(station.peakStartHour),
      peakEndHour: String(station.peakEndHour),
      idleFeePerMin: String(station.idleFeePerMin),
      rates,
    },
  });
  const { errors } = formState;

  const mutation = useMutation({
    mutationFn: (v: { peakStartHour: number; peakEndHour: number; idleFeePerMin: number; rates: Partial<typeof rates> }) =>
      stationApi.setPrices(station.id, {
        peakStartHour: v.peakStartHour,
        peakEndHour: v.peakEndHour,
        idleFeePerMin: v.idleFeePerMin,
        prices: CONNECTORS.filter((t) => v.rates[t]?.pricePerKwh).map((t) => ({
          connectorType: t,
          pricePerKwh: Number(v.rates[t]!.pricePerKwh),
          peakPricePerKwh: Number(v.rates[t]!.peakPricePerKwh),
        })),
      }),
    onSuccess: () => {
      notify(`Prices saved for ${station.code}`);
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Prices · {station.code}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogContent dividers>
          {mutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(mutation.error)}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField label="Peak hours from" type="number" {...register('peakStartHour', { deps: ['peakEndHour'] })} error={!!errors.peakStartHour} helperText={errors.peakStartHour?.message ?? '0–23'} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField label="Peak hours to" type="number" {...register('peakEndHour')} error={!!errors.peakEndHour} helperText={errors.peakEndHour?.message ?? '1–24'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Idle fee per minute" {...register('idleFeePerMin')} error={!!errors.idleFeePerMin} helperText={errors.idleFeePerMin?.message ?? 'After 10 free minutes'} slotProps={rupee} />
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle2">Price per kWh for each charging type</Typography>
              <Typography variant="caption" color="text.secondary">
                Leave a row empty if you don't offer that type. Types you already have chargers for are required.
              </Typography>
            </Grid>
            {CONNECTORS.map((t) => {
              const e = errors.rates?.[t];
              return (
                <Grid key={t} size={12} container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography sx={{ fontWeight: 600 }}>{connectorLabel(t)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {typesInUse.includes(t) ? 'Required (in use)' : 'Optional'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField label="Price per kWh" {...register(`rates.${t}.pricePerKwh`, { deps: [`rates.${t}.peakPricePerKwh`] })} error={!!e?.pricePerKwh} helperText={e?.pricePerKwh?.message} slotProps={rupee} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField label="Peak price per kWh" {...register(`rates.${t}.peakPricePerKwh`)} error={!!e?.peakPricePerKwh} helperText={e?.peakPricePerKwh?.message} slotProps={rupee} />
                  </Grid>
                </Grid>
              );
            })}
          </Grid>
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
