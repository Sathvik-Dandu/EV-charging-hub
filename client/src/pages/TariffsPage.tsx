import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, Switch, TextField, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import { tariffApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import type { Tariff } from '../api/types';
import { tariffSchema } from '../schemas/forms';
import { money } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import { useNotify } from '../components/common/Notifier';

export default function TariffsPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Tariff | 'new' | null>(null);
  const { data: tariffs = [] } = useQuery({ queryKey: ['tariffs'], queryFn: tariffApi.list });

  const toggle = useMutation({
    mutationFn: (t: Tariff) => tariffApi.update(t.id, { isActive: !t.isActive }),
    onSuccess: () => {
      notify('Tariff updated');
      queryClient.invalidateQueries({ queryKey: ['tariffs'] });
    },
  });

  return (
    <>
      <PageHeader
        title="Tariff master"
        subtitle="Energy rate, peak-hour rate and idle fee applied to every invoice"
        action={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setEditing('new')}>
            New tariff
          </Button>
        }
      />
      <Grid container spacing={2.5}>
        {tariffs.map((t) => (
          <Grid key={t.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card sx={{ opacity: t.isActive ? 1 : 0.55 }}>
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">{t.name}</Typography>
                  <Stack direction="row" sx={{ alignItems: 'center' }}>
                    <Switch checked={t.isActive} onChange={() => toggle.mutate(t)} />
                    <Button size="small" startIcon={<EditRounded />} onClick={() => setEditing(t)}>
                      Edit
                    </Button>
                  </Stack>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Used by {t._count?.stations ?? 0} station(s)
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {[
                    ['Off-peak', `${money(t.energyRate)}/kWh`],
                    ['Peak', `${money(t.peakRate)}/kWh`],
                    ['Peak hours', `${t.peakStartHour}:00 – ${t.peakEndHour}:00`],
                    ['Idle fee', `${money(t.idleFeePerMin)}/min`],
                  ].map(([k, v]) => (
                    <Grid key={k} size={6}>
                      <Typography variant="caption" color="text.secondary">
                        {k}
                      </Typography>
                      <Typography sx={{ fontWeight: 700 }}>{v}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <TariffDialog tariff={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function TariffDialog({ tariff, onClose }: { tariff: Tariff | 'new' | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const empty = { name: '', energyRate: '', peakRate: '', peakStartHour: '18', peakEndHour: '22', idleFeePerMin: '' };
  const { register, handleSubmit, reset, formState } = useForm({ resolver: zodResolver(tariffSchema), mode: 'onChange', defaultValues: empty });
  const { errors } = formState;

  useEffect(() => {
    if (tariff && tariff !== 'new') {
      reset({
        name: tariff.name,
        energyRate: String(tariff.energyRate),
        peakRate: String(tariff.peakRate),
        peakStartHour: String(tariff.peakStartHour),
        peakEndHour: String(tariff.peakEndHour),
        idleFeePerMin: String(tariff.idleFeePerMin),
      });
    } else if (tariff === 'new') reset(empty);
  }, [tariff]);

  const mutation = useMutation({
    mutationFn: (v: object) => (tariff === 'new' ? tariffApi.create(v) : tariffApi.update((tariff as Tariff).id, v)),
    onSuccess: () => {
      notify('Tariff saved');
      queryClient.invalidateQueries({ queryKey: ['tariffs'] });
      onClose();
    },
  });

  const field = (name: 'name' | 'energyRate' | 'peakRate' | 'peakStartHour' | 'peakEndHour' | 'idleFeePerMin', text: string) => (
    <TextField label={text} {...register(name)} error={!!errors[name]} helperText={errors[name]?.message} />
  );

  return (
    <Dialog open={!!tariff} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{tariff === 'new' ? 'New tariff' : 'Edit tariff'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {mutation.isError && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
            {field('name', 'Tariff name')}
            <Stack direction="row" spacing={2}>
              {field('energyRate', 'Off-peak ₹/kWh')}
              {field('peakRate', 'Peak ₹/kWh')}
            </Stack>
            <Stack direction="row" spacing={2}>
              {field('peakStartHour', 'Peak start (hour)')}
              {field('peakEndHour', 'Peak end (hour)')}
            </Stack>
            {field('idleFeePerMin', 'Idle fee ₹/min')}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
