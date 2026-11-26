import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography, alpha } from '@mui/material';
import { bookingApi, chargerApi, vehicleApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import type { Charger, Station } from '../../api/types';
import { bookingSchema, SLOT_DURATIONS } from '../../schemas/forms';
import { money, timeOnly } from '../../utils/format';
import { useNotify } from '../common/Notifier';
import { connectorLabel } from '../../config/connectors';

const SLOT_STEP_MINUTES = 30;
const MAX_ADVANCE_DAYS = 7;

interface Props {
  open: boolean;
  onClose: () => void;
  station: Station;
  charger: Charger;
}

export default function BookSlotDialog({ open, onClose, station, charger }: Props) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: vehicleApi.mine, enabled: open });
  const compatible = vehicles.filter((v) => v.connectorType === charger.connectorType);

  const { control, register, handleSubmit, reset, setValue, formState } = useForm({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: { vehicleId: '', chargerId: String(charger.id), date: dayjs().format('YYYY-MM-DD'), time: '', durationMinutes: '60' },
  });
  const [date, time, duration, vehicleId] = useWatch({ control, name: ['date', 'time', 'durationMinutes', 'vehicleId'] });

  useEffect(() => {
    if (open) reset({ vehicleId: compatible[0] ? String(compatible[0].id) : '', chargerId: String(charger.id), date: dayjs().format('YYYY-MM-DD'), time: '', durationMinutes: '60' });
  }, [open, charger.id, compatible.length]);

  const { data: slots } = useQuery({
    queryKey: ['slots', charger.id, date],
    queryFn: () => chargerApi.slots(charger.id, date),
    enabled: open && !!date,
  });

  const timeOptions = useMemo(() => {
    const [oh, om] = station.opensAt.split(':').map(Number);
    const [ch, cm] = station.closesAt.split(':').map(Number);
    const options: { value: string; disabled: boolean }[] = [];
    const now = dayjs();
    for (let m = oh * 60 + om; m + Number(duration) <= ch * 60 + cm + 1; m += SLOT_STEP_MINUTES) {
      const start = dayjs(`${date}T00:00`).add(m, 'minute');
      const end = start.add(Number(duration), 'minute');
      const taken = slots?.bookings.some((b) => start.isBefore(b.endTime) && dayjs(b.startTime).isBefore(end));
      if (start.isBefore(now.subtract(1, 'minute'))) continue;
      options.push({ value: start.format('HH:mm'), disabled: !!taken });
    }
    return options;
  }, [station, date, duration, slots]);

  const vehicle = vehicles.find((v) => v.id === Number(vehicleId));
  const estimate = useMemo(() => {
    if (!vehicle) return null;
    const energy = Math.min((charger.powerKw * Number(duration) * 0.92) / 60, vehicle.batteryKwh * 0.8);
    const hour = Number(time?.split(':')[0] ?? 0);
    const peak = hour >= station.tariff.peakStartHour && hour < station.tariff.peakEndHour;
    return { energy, cost: energy * (peak ? station.tariff.peakRate : station.tariff.energyRate) * 1.18, peak };
  }, [vehicle, duration, time, charger, station]);

  const mutation = useMutation({
    mutationFn: (v: { vehicleId: number; date: string; time: string; durationMinutes: number }) =>
      bookingApi.create({
        vehicleId: v.vehicleId,
        chargerId: charger.id,
        startTime: dayjs(`${v.date}T${v.time}`).toISOString(),
        durationMinutes: v.durationMinutes,
      }),
    onSuccess: (booking) => {
      notify(`Slot booked! Reference ${booking.reference}`);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Book a charging slot
        <Typography variant="body2" color="text.secondary">
          {station.name} · {charger.code} · {connectorLabel(charger.connectorType)} · {charger.powerKw} kW
        </Typography>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {mutation.isError && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
            {vehicles.length > 0 && compatible.length === 0 && (
              <Alert severity="warning">None of your vehicles use {connectorLabel(charger.connectorType)}. Choose a compatible charger.</Alert>
            )}
            <TextField select label="Vehicle" {...register('vehicleId')} value={vehicleId} error={!!formState.errors.vehicleId} helperText={formState.errors.vehicleId?.message}>
              {vehicles.map((v) => (
                <MenuItem key={v.id} value={String(v.id)} disabled={v.connectorType !== charger.connectorType}>
                  {v.make} {v.model} · {v.registrationNo} · {connectorLabel(v.connectorType)}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                type="date"
                label="Date"
                {...register('date')}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: dayjs().format('YYYY-MM-DD'), max: dayjs().add(MAX_ADVANCE_DAYS, 'day').format('YYYY-MM-DD') },
                }}
              />
              <TextField select label="Duration" {...register('durationMinutes')} value={duration}>
                {SLOT_DURATIONS.map((d) => (
                  <MenuItem key={d} value={String(d)}>
                    {d} minutes
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Start time <Typography component="span" variant="caption" color="text.secondary">(greyed slots are already booked)</Typography>
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 1, maxHeight: 180, overflowY: 'auto' }}>
                {timeOptions.map((o) => (
                  <Button
                    key={o.value}
                    size="small"
                    disabled={o.disabled}
                    variant={time === o.value ? 'contained' : 'outlined'}
                    onClick={() => setValue('time', o.value, { shouldValidate: true })}
                    sx={{ px: 0, minWidth: 0 }}
                  >
                    {o.value}
                  </Button>
                ))}
                {timeOptions.length === 0 && <Typography variant="body2" color="text.secondary">No slots left on this date.</Typography>}
              </Box>
              {formState.errors.time && (
                <Typography variant="caption" color="error">
                  {formState.errors.time.message}
                </Typography>
              )}
            </Box>
            {slots && slots.bookings.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                Booked: {slots.bookings.map((b) => `${timeOnly(b.startTime)}–${timeOnly(b.endTime)}`).join(', ')}
              </Typography>
            )}
            {estimate && time && (
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: (t) => alpha(t.palette.primary.main, 0.08) }}>
                <Typography variant="body2" color="text.secondary">
                  Estimated {estimate.peak ? 'peak' : 'off-peak'} charge
                </Typography>
                <Typography variant="h6">
                  ~{estimate.energy.toFixed(1)} kWh · {money(estimate.cost)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Rates: {money(station.tariff.energyRate)}/kWh off-peak, {money(station.tariff.peakRate)}/kWh peak ({station.tariff.peakStartHour}:00–
                  {station.tariff.peakEndHour}:00), incl. 18% GST
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending || compatible.length === 0}>
            {mutation.isPending ? 'Booking…' : 'Confirm booking'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
