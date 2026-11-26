import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Stack, TextField, Typography, alpha } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import BoltRounded from '@mui/icons-material/BoltRounded';
import StopCircleRounded from '@mui/icons-material/StopCircleRounded';
import { useAppSelector } from '../app/store';
import { can } from '../config/permissions';
import { chargerApi, sessionApi, vehicleApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import type { ChargingSession } from '../api/types';
import { connectorLabel } from '../config/connectors';
import { brand } from '../theme/palette';
import { dateTime, kwh, minutesToText, money } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import { useNotify } from '../components/common/Notifier';

const LIVE_REFRESH_MS = 3000;

export default function SessionsPage() {
  const role = useAppSelector((s) => s.auth.user!.role);
  const [stopping, setStopping] = useState<ChargingSession | null>(null);
  const [walkIn, setWalkIn] = useState(false);
  const { data: active = [] } = useQuery({ queryKey: ['sessions', 'ACTIVE'], queryFn: () => sessionApi.list('ACTIVE'), refetchInterval: LIVE_REFRESH_MS });
  const { data: history = [], isLoading } = useQuery({ queryKey: ['sessions', 'COMPLETED'], queryFn: () => sessionApi.list('COMPLETED') });
  const canControl = can(role, 'sessions:control');

  const columns: GridColDef<ChargingSession>[] = [
    { field: 'id', headerName: '#', width: 80 },
    { field: 'station', headerName: 'Station', flex: 1, minWidth: 180, valueGetter: (_, r) => r.charger.station.name },
    { field: 'charger', headerName: 'Charger', width: 130, valueGetter: (_, r) => r.charger.code },
    { field: 'vehicle', headerName: 'Vehicle', width: 130, valueGetter: (_, r) => r.vehicle.registrationNo },
    { field: 'startedAt', headerName: 'Started', width: 190, valueFormatter: (v) => dateTime(v) },
    { field: 'durationMin', headerName: 'Duration', width: 100, valueFormatter: (v) => minutesToText(v) },
    { field: 'energyKwh', headerName: 'Energy', width: 110, valueFormatter: (v) => kwh(v) },
    { field: 'total', headerName: 'Bill', width: 120, valueGetter: (_, r) => r.invoice?.totalAmount ?? 0, valueFormatter: (v) => money(v) },
  ];

  return (
    <>
      <PageHeader
        title="Charging sessions"
        subtitle="Monitor energy delivered in real time, stop sessions and generate invoices"
        action={
          can(role, 'vehicles:manage') && (
            <Button variant="outlined" startIcon={<BoltRounded />} onClick={() => setWalkIn(true)}>
              Walk-in charge
            </Button>
          )
        }
      />

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        Live sessions ({active.length})
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {active.length === 0 && (
          <Grid size={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>No vehicles are charging right now.</CardContent>
            </Card>
          </Grid>
        )}
        {active.map((s) => (
          <Grid key={s.id} size={{ xs: 12, md: 6, xl: 4 }}>
            <LiveSessionCard session={s} onStop={canControl ? () => setStopping(s) : undefined} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        Session history
      </Typography>
      <Card>
        <Box sx={{ height: 520 }}>
          <DataGrid rows={history} columns={columns} loading={isLoading} disableRowSelectionOnClick initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[10, 25, 50]} sx={{ border: 0 }} />
        </Box>
      </Card>

      <StopSessionDialog session={stopping} onClose={() => setStopping(null)} />
      <WalkInDialog open={walkIn} onClose={() => setWalkIn(false)} />
    </>
  );
}

function LiveSessionCard({ session, onStop }: { session: ChargingSession; onStop?: () => void }) {
  const capacity = session.vehicle.batteryKwh * 0.8;
  const percent = Math.min(100, Math.round((session.energyKwh / capacity) * 100));
  return (
    <Card sx={{ borderColor: alpha(brand.navy, 0.4), position: 'relative', overflow: 'hidden' }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="secondary" sx={{ fontWeight: 800, letterSpacing: '0.1em' }}>
              {session.batteryFull ? 'CHARGE COMPLETE' : 'CHARGING'}
            </Typography>
            <Typography variant="h6">
              {session.vehicle.make} {session.vehicle.model}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {session.vehicle.registrationNo} · {session.charger.code} · {session.charger.station.name}
            </Typography>
          </Box>
          <BoltRounded sx={{ color: brand.navy, fontSize: 32, animation: 'evPulse 1.4s infinite' }} />
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, mt: 2 }}>
          <Typography variant="h3" className="mono" sx={{ fontWeight: 700, color: brand.tealDark }}>
            {session.energyKwh.toFixed(2)}
          </Typography>
          <Typography color="text.secondary">kWh delivered</Typography>
        </Stack>
        <Box sx={{ mt: 1.5, height: 12, borderRadius: 6, bgcolor: (t) => alpha(t.palette.text.primary, 0.08), overflow: 'hidden' }}>
          <Box
            sx={{
              width: `${percent}%`,
              height: '100%',
              borderRadius: 6,
              transition: 'width 1s',
              background: `repeating-linear-gradient(90deg, ${brand.tealDark} 0 20px, ${brand.sage} 20px 40px)`,
              animation: session.batteryFull ? 'none' : 'evFlow 1s linear infinite',
            }}
          />
        </Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {percent}% of charge window · {session.charger.powerKw} kW
          </Typography>
          <Typography variant="caption" className="mono">
            {minutesToText(session.durationMin)}
          </Typography>
        </Stack>
        {onStop && (
          <Button fullWidth variant="contained" color="error" startIcon={<StopCircleRounded />} sx={{ mt: 2 }} onClick={onStop}>
            Stop & generate invoice
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function StopSessionDialog({ session, onClose }: { session: ChargingSession | null; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<ChargingSession | null>(null);

  const mutation = useMutation({
    mutationFn: () => sessionApi.stop(session!.id),
    onSuccess: (s) => {
      setResult(s);
      notify(`Session stopped. Invoice ${s.invoice?.invoiceNo} generated`);
      queryClient.invalidateQueries();
    },
  });

  const close = () => {
    setResult(null);
    mutation.reset();
    onClose();
  };
  const inv = result?.invoice;

  return (
    <Dialog open={!!session} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{inv ? `Invoice ${inv.invoiceNo}` : 'Stop charging session'}</DialogTitle>
      {inv ? (
        <>
          <DialogContent dividers>
            <Stack spacing={1}>
              {[
                ['Energy delivered', kwh(result!.energyKwh)],
                [`Price per kWh`, money(inv.pricePerKwh)],
                [`Energy cost`, money(inv.energyCost)],
                ['GST 18%', money(inv.taxAmount)],
              ].map(([k, v]) => (
                <Stack key={k} direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{k}</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{v}</Typography>
                </Stack>
              ))}
              <Stack direction="row" sx={{ justifyContent: 'space-between', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6" color="primary">
                  {money(inv.totalAmount)}
                </Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button variant="contained" onClick={close}>
              Done
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent dividers>
            <Stack spacing={2}>
              {mutation.isError && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
              <Typography variant="body2" color="text.secondary">
                Energy so far: <b>{kwh(session?.energyKwh ?? 0)}</b>. Stopping creates the invoice: energy × price per kWh + 18% GST.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={close}>Cancel</Button>
            <Button variant="contained" color="error" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              Stop session
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

function WalkInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [vehicleId, setVehicleId] = useState('');
  const [chargerId, setChargerId] = useState('');
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: vehicleApi.mine, enabled: open });
  const { data: chargers = [] } = useQuery({ queryKey: ['chargers'], queryFn: chargerApi.list, enabled: open });
  const vehicle = vehicles.find((v) => v.id === Number(vehicleId));
  const available = chargers.filter((c) => c.status === 'AVAILABLE' && c.isActive && (!vehicle || c.connectorType === vehicle.connectorType));

  const mutation = useMutation({
    mutationFn: () => sessionApi.start({ vehicleId: Number(vehicleId), chargerId: Number(chargerId) }),
    onSuccess: () => {
      notify('Walk-in charging started');
      queryClient.invalidateQueries();
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Walk-in charging</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {mutation.isError && <Alert severity="error">{errorMessage(mutation.error)}</Alert>}
          <Alert severity="info">Walk-in is allowed only on an available charger with no booking in the next hour.</Alert>
          <TextField select label="Vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
              <MenuItem key={v.id} value={String(v.id)}>
                {v.make} {v.model} · {connectorLabel(v.connectorType)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Available charger" value={chargerId} onChange={(e) => setChargerId(e.target.value)} disabled={!vehicle}>
            {available.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.code} · {c.station?.name} · {c.powerKw} kW
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!vehicleId || !chargerId || mutation.isPending} onClick={() => mutation.mutate()}>
          Start charging
        </Button>
      </DialogActions>
    </Dialog>
  );
}
