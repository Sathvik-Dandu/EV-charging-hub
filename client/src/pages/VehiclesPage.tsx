import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Stack, TextField, Typography, alpha } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import ElectricCarRounded from '@mui/icons-material/ElectricCarRounded';
import { vehicleApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { vehicleSchema } from '../schemas/forms';
import { CONNECTORS, connectorLabel } from '../config/connectors';
import { brand } from '../theme/palette';
import PageHeader from '../components/common/PageHeader';
import { useNotify } from '../components/common/Notifier';

export default function VehiclesPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: vehicleApi.mine });

  const remove = useMutation({
    mutationFn: vehicleApi.remove,
    onSuccess: () => {
      notify('Vehicle removed');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  return (
    <>
      <PageHeader
        title="My vehicles"
        subtitle="Register vehicles with connector type and battery capacity to book compatible chargers"
        action={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setOpen(true)}>
            Add vehicle
          </Button>
        }
      />
      <Grid container spacing={2.5}>
        {vehicles.length === 0 && (
          <Grid size={12}>
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
              No vehicles yet. Add your EV to start booking charging slots.
            </Typography>
          </Grid>
        )}
        {vehicles.map((v) => (
          <Grid key={v.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: alpha(brand.tealDark, 0.12), color: brand.tealDark }}>
                    <ElectricCarRounded fontSize="large" />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {v.make} {v.model}
                    </Typography>
                    <Typography className="mono" color="text.secondary">
                      {v.registrationNo}
                    </Typography>
                  </Box>
                  <IconButton aria-label="delete vehicle" onClick={() => remove.mutate(v.id)}>
                    <DeleteOutlineRounded />
                  </IconButton>
                </Stack>
                <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Connector
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{connectorLabel(v.connectorType)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Battery
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{v.batteryKwh} kWh</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <AddVehicleDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AddVehicleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState } = useForm({
    resolver: zodResolver(vehicleSchema),
    mode: 'onChange',
    defaultValues: { registrationNo: '', make: '', model: '', connectorType: 'CCS2' as const, batteryKwh: '' },
  });
  const { errors } = formState;

  const mutation = useMutation({
    mutationFn: vehicleApi.create,
    onSuccess: () => {
      notify('Vehicle added');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      reset();
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add vehicle</DialogTitle>
      <Box component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {mutation.isError && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
            <TextField label="Registration number" placeholder="KA01AB1234" {...register('registrationNo')} error={!!errors.registrationNo} helperText={errors.registrationNo?.message} />
            <TextField label="Make" placeholder="Tata" {...register('make')} error={!!errors.make} helperText={errors.make?.message} />
            <TextField label="Model" placeholder="Nexon EV" {...register('model')} error={!!errors.model} helperText={errors.model?.message} />
            <TextField select label="Connector type" {...register('connectorType')} value={watch('connectorType')}>
              {CONNECTORS.map((c) => (
                <MenuItem key={c} value={c}>
                  {connectorLabel(c)}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Battery capacity (kWh)" {...register('batteryKwh')} error={!!errors.batteryKwh} helperText={errors.batteryKwh?.message} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            Save vehicle
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
