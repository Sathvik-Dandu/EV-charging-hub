import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Card, CardContent, Divider, FormControlLabel, Grid, MenuItem, Skeleton, Stack, Switch, TextField, Typography } from '@mui/material';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import { stationApi } from '../../api/endpoints';
import type { Charger, ConnectorType, Station } from '../../api/types';
import { useAppSelector } from '../../app/store';
import { can } from '../../config/permissions';
import { CONNECTORS, connectorLabel } from '../../config/connectors';
import { money } from '../../utils/format';
import { lowestPrice, priceFor } from '../../utils/prices';
import StatusChip from '../common/StatusChip';
import BookSlotDialog from '../dialogs/BookSlotDialog';
import { brand } from '../../theme/palette';

export default function FindChargers({ city }: { city: string }) {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [connector, setConnector] = useState<ConnectorType | ''>('');
  const [available, setAvailable] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [booking, setBooking] = useState<{ station: Station; charger: Charger } | null>(null);
  const activeCity = cityFilter || city;
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: stationApi.cities });
  const { data: stations, isLoading } = useQuery({
    queryKey: ['stations', 'public', activeCity, connector, available],
    queryFn: () => stationApi.search({ city: activeCity, connector, available }),
  });
  const canBook = can(user?.role, 'bookings:create');

  const book = (station: Station, charger: Charger) => {
    if (!user) return navigate('/login', { state: { from: '/stations' } });
    if (canBook) setBooking({ station, charger });
  };

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
            <TextField select label="City" value={cities.includes(activeCity) ? activeCity : ''} onChange={(e) => setCityFilter(e.target.value)} sx={{ maxWidth: { md: 240 } }}>
              <MenuItem value="">All cities</MenuItem>
              {cities.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Connector" value={connector} onChange={(e) => setConnector(e.target.value as ConnectorType | '')} sx={{ maxWidth: { md: 240 } }}>
              <MenuItem value="">All connectors</MenuItem>
              {CONNECTORS.map((c) => (
                <MenuItem key={c} value={c}>
                  {connectorLabel(c)}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel control={<Switch checked={available} onChange={(e) => setAvailable(e.target.checked)} />} label="Available now" />
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2.5}>
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={220} />
            </Grid>
          ))}
        {stations?.length === 0 && (
          <Grid size={12}>
            <Box sx={{ textAlign: 'center', py: 6, borderRadius: 5, bgcolor: brand.mist }}>
              <Typography variant="h6">No stations match yet</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Try another city or connector. New stations appear here as soon as station owners add them.
              </Typography>
            </Box>
          </Grid>
        )}
        {stations?.map((station) => (
          <Grid key={station.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="caption" className="mono" sx={{ color: brand.tealDark, fontWeight: 700 }}>
                  {station.code}
                </Typography>
                <Typography variant="h6">{station.name}</Typography>
                <Stack spacing={0.5} sx={{ mt: 1, color: 'text.secondary' }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <PlaceOutlined sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {station.address}, {station.city}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <ScheduleOutlined sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {station.opensAt === '00:00' && station.closesAt === '23:59' ? 'Open 24 hours' : `${station.opensAt} – ${station.closesAt}`}{lowestPrice(station) !== undefined && ` · from ${money(lowestPrice(station)!)}/kWh`}
                    </Typography>
                  </Stack>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1.25}>
                  {station.chargers.map((charger) => (
                    <Stack key={charger.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {connectorLabel(charger.connectorType)} · {charger.powerKw} kW
                        </Typography>
                        <Typography variant="caption" className="mono" color="text.secondary">
                          {charger.code}
                          {priceFor(station, charger.connectorType) && ` · ${money(priceFor(station, charger.connectorType)!.pricePerKwh)}/kWh`}
                        </Typography>
                      </Box>
                      <StatusChip value={charger.status} />
                      {(!user || canBook) && (
                        <Button size="small" variant="contained" disabled={charger.status === 'FAULTY'} onClick={() => book(station, charger)}>
                          {user ? 'Book' : 'Sign in to book'}
                        </Button>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {booking && <BookSlotDialog open onClose={() => setBooking(null)} station={booking.station} charger={booking.charger} />}
    </>
  );
}
