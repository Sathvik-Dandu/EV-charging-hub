import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined';
import PowerSettingsNewRounded from '@mui/icons-material/PowerSettingsNewRounded';
import { useAppSelector } from '../app/store';
import { chargerApi, stationApi } from '../api/endpoints';
import type { Charger, ConnectorType, Station } from '../api/types';
import { CONNECTORS, connectorLabel } from '../config/connectors';
import { can } from '../config/permissions';
import { chargerStatusColors } from '../theme/palette';
import { money } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import StatusChip from '../components/common/StatusChip';
import BookSlotDialog from '../components/dialogs/BookSlotDialog';
import ReportFaultDialog from '../components/dialogs/ReportFaultDialog';
import { AddChargerDialog, AddStationDialog } from '../components/dialogs/StationDialogs';

export default function StationsPage() {
  const role = useAppSelector((s) => s.auth.user!.role);
  const isManager = can(role, 'stations:edit');
  const canAddStation = can(role, 'stations:create');
  const canAddCharger = can(role, 'chargers:manage');
  const isOwner = role === 'STATION_OWNER';
  const canBook = can(role, 'bookings:create');
  const canReport = can(role, 'tickets:create');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ city: string; connector: ConnectorType | ''; available: boolean }>({ city: '', connector: '', available: false });
  const [booking, setBooking] = useState<{ station: Station; charger: Charger } | null>(null);
  const [faultCharger, setFaultCharger] = useState<number | undefined>();
  const [faultOpen, setFaultOpen] = useState(false);
  const [addStation, setAddStation] = useState(false);
  const [addChargerTo, setAddChargerTo] = useState<Station | null>(null);

  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: stationApi.cities });
  const { data: stations, isLoading } = useQuery({ queryKey: ['stations', filters], queryFn: () => stationApi.search({ ...filters, manage: isManager }) });

  const toggleCharger = useMutation({
    mutationFn: (c: Charger) => chargerApi.setActive(c.id, !c.isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stations'] }),
  });

  return (
    <>
      <PageHeader
        title={isOwner ? 'My stations' : 'Charging stations'}
        subtitle={
          isOwner
            ? 'Add your stations and chargers. They are listed for drivers as soon as you save them.'
            : role === 'ADMIN'
              ? 'Every station on the network, including inactive ones'
              : 'Find nearby stations by city, connector type and live availability'
        }
        action={
          canAddStation && (
            <Button variant="contained" startIcon={<AddRounded />} onClick={() => setAddStation(true)}>
              Add station
            </Button>
          )
        }
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
          <TextField select label="City" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} sx={{ maxWidth: { md: 220 } }}>
            <MenuItem value="">All cities</MenuItem>
            {cities.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Connector"
            value={filters.connector}
            onChange={(e) => setFilters({ ...filters, connector: e.target.value as ConnectorType | '' })}
            sx={{ maxWidth: { md: 220 } }}
          >
            <MenuItem value="">All connectors</MenuItem>
            {CONNECTORS.map((c) => (
              <MenuItem key={c} value={c}>
                {connectorLabel(c)}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={filters.available} onChange={(e) => setFilters({ ...filters, available: e.target.checked })} />}
            label="Available now"
          />
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1.5}>
            {Object.entries(chargerStatusColors).map(([status, color]) => (
              <Stack key={status} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                <Typography variant="caption">{status[0] + status.slice(1).toLowerCase()}</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2.5}>
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, md: 6, xl: 4 }}>
              <Skeleton variant="rounded" height={280} />
            </Grid>
          ))}
        {stations?.length === 0 && (
          <Grid size={12}>
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
              No stations match these filters.
            </Typography>
          </Grid>
        )}
        {stations?.map((station) => (
          <Grid key={station.id} size={{ xs: 12, md: 6, xl: 4 }}>
            <Card sx={{ height: '100%', opacity: station.isActive ? 1 : 0.6 }}>
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="caption" className="mono" color="primary" sx={{ fontWeight: 700 }}>
                      {station.code}
                    </Typography>
                    <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                      {station.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${station.availableCount} free`}
                    size="small"
                    sx={{
                      bgcolor: (t) => alpha(station.availableCount ? t.palette.success.main : t.palette.error.main, 0.12),
                      color: station.availableCount ? 'success.main' : 'error.main',
                    }}
                  />
                </Stack>
                <Stack spacing={0.5} sx={{ mt: 1.5, color: 'text.secondary' }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <PlaceRounded sx={{ fontSize: 16 }} />
                    <Typography variant="body2" noWrap>
                      {station.address}, {station.city}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <ScheduleRounded sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {station.opensAt === '00:00' && station.closesAt === '23:59' ? 'Open 24 hours' : `${station.opensAt} – ${station.closesAt}`} · {station.tariff.name}{' '}
                      {money(station.tariff.energyRate)}/kWh
                    </Typography>
                  </Stack>
                  {role === 'ADMIN' && (
                    <Typography variant="body2">
                      Owner: {station.owner ? `${station.owner.fullName}${station.owner.organization ? ` · ${station.owner.organization}` : ''}` : 'Network (admin)'}
                    </Typography>
                  )}
                </Stack>
                {station.chargers.length === 0 && (
                  <Typography variant="body2" sx={{ mt: 2, color: 'warning.main' }}>
                    No chargers yet. Drivers can't book this station until you add one.
                  </Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1.25}>
                  {station.chargers.map((charger) => (
                    <Stack key={charger.id} direction="row" spacing={1} sx={{ alignItems: 'center', opacity: charger.isActive ? 1 : 0.5 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} className="mono">
                          {charger.code}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {connectorLabel(charger.connectorType)} · {charger.powerKw} kW
                        </Typography>
                      </Box>
                      <StatusChip value={charger.status} />
                      {canBook && (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={charger.status === 'FAULTY'}
                          onClick={() => setBooking({ station, charger })}
                        >
                          Book
                        </Button>
                      )}
                      {canReport && (
                        <Tooltip title="Report fault">
                          <IconButton
                            size="small"
                            aria-label="report fault"
                            onClick={() => {
                              setFaultCharger(charger.id);
                              setFaultOpen(true);
                            }}
                          >
                            <ReportProblemOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canAddCharger && (
                        <Tooltip title={charger.isActive ? 'Deactivate charger' : 'Activate charger'}>
                          <IconButton size="small" aria-label="toggle charger" onClick={() => toggleCharger.mutate(charger)} color={charger.isActive ? 'default' : 'primary'}>
                            <PowerSettingsNewRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  ))}
                </Stack>
                {canAddCharger && (
                  <Button size="small" startIcon={<AddRounded />} sx={{ mt: 2 }} onClick={() => setAddChargerTo(station)}>
                    Add charger
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {booking && <BookSlotDialog open onClose={() => setBooking(null)} station={booking.station} charger={booking.charger} />}
      <ReportFaultDialog open={faultOpen} onClose={() => setFaultOpen(false)} chargerId={faultCharger} />
      <AddStationDialog open={addStation} onClose={() => setAddStation(false)} />
      <AddChargerDialog station={addChargerTo} onClose={() => setAddChargerTo(null)} />
    </>
  );
}
