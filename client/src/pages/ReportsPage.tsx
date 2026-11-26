import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Grid, LinearProgress, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { reportApi } from '../api/endpoints';
import { brand } from '../theme/palette';
import { kwh, label, money } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import StatusChip from '../components/common/StatusChip';

const PERIODS = [7, 30, 90];

function ReportCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

const Empty = ({ cols }: { cols: number }) => (
  <TableRow>
    <TableCell colSpan={cols} sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
      No data for this period yet
    </TableCell>
  </TableRow>
);

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const { data: utilization = [] } = useQuery({ queryKey: ['report-util', days], queryFn: () => reportApi.utilization(days) });
  const { data: byHour = [] } = useQuery({ queryKey: ['report-hour', days], queryFn: () => reportApi.utilizationByHour(days) });
  const { data: revenue = [] } = useQuery({ queryKey: ['report-revenue', days], queryFn: () => reportApi.revenue(days) });
  const { data: faults = [] } = useQuery({ queryKey: ['report-faults'], queryFn: reportApi.faults });
  const { data: bookings = {} } = useQuery({ queryKey: ['report-bookings', days], queryFn: () => reportApi.bookings(days) });
  const peak = byHour.reduce((m, h) => Math.max(m, h.utilization), 0) || 1;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Utilization, revenue, faults and bookings across the whole network"
        action={
          <TextField select label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))} sx={{ width: 170 }}>
            {PERIODS.map((p) => (
              <MenuItem key={p} value={p}>
                Last {p} days
              </MenuItem>
            ))}
          </TextField>
        }
      />
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <ReportCard title="Booking report" subtitle="Bookings by outcome in the selected period">
            <Grid container spacing={2}>
              {['COMPLETED', 'CANCELLED', 'NO_SHOW', 'CONFIRMED', 'IN_PROGRESS'].map((s) => (
                <Grid key={s} size={{ xs: 6, md: 2.4 }}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: brand.mist }}>
                    <Typography sx={{ fontSize: 28, fontWeight: 600 }}>{bookings[s] ?? 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {label(s)}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </ReportCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <ReportCard title="Utilization report" subtitle="Share of charger time in use, by station">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Station</TableCell>
                  <TableCell align="right">Chargers</TableCell>
                  <TableCell align="right">Sessions</TableCell>
                  <TableCell align="right">Charging hours</TableCell>
                  <TableCell align="right">Utilization</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {utilization.length === 0 && <Empty cols={5} />}
                {utilization.map((r) => (
                  <TableRow key={r.code} hover>
                    <TableCell>
                      {r.station}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {r.code} · {r.city}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{r.chargers}</TableCell>
                    <TableCell align="right">{r.sessions}</TableCell>
                    <TableCell align="right">{r.chargingHours}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {r.utilization}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ReportCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <ReportCard title="Utilization by time of day" subtitle="Average share of chargers in use per hour">
            {byHour
              .filter((h) => h.utilization > 0)
              .map((h) => (
                <Box key={h.hour} sx={{ display: 'grid', gridTemplateColumns: '56px 1fr 52px', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Typography variant="body2" className="mono">
                    {h.hour}
                  </Typography>
                  <LinearProgress variant="determinate" value={(h.utilization / peak) * 100} color="secondary" sx={{ height: 8, borderRadius: 4 }} />
                  <Typography variant="body2" align="right">
                    {h.utilization}%
                  </Typography>
                </Box>
              ))}
            {byHour.every((h) => h.utilization === 0) && <Typography color="text.secondary">No charging sessions in this period yet</Typography>}
          </ReportCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ReportCard title="Revenue report" subtitle="Revenue and energy delivered, by station">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Station</TableCell>
                  <TableCell align="right">Sessions</TableCell>
                  <TableCell align="right">Energy</TableCell>
                  <TableCell align="right">Billed</TableCell>
                  <TableCell align="right">Paid</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {revenue.length === 0 && <Empty cols={5} />}
                {revenue.map((r) => (
                  <TableRow key={r.code} hover>
                    <TableCell>{r.station}</TableCell>
                    <TableCell align="right">{r.sessions}</TableCell>
                    <TableCell align="right">{kwh(r.energy)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {money(r.revenue)}
                    </TableCell>
                    <TableCell align="right">{money(r.paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ReportCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ReportCard title="Fault & downtime report" subtitle="Every fault ticket and how long the charger was down">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ticket</TableCell>
                  <TableCell>Charger</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Technician</TableCell>
                  <TableCell align="right">Downtime</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {faults.length === 0 && <Empty cols={5} />}
                {faults.map((f) => (
                  <TableRow key={f.ticketNo} hover>
                    <TableCell className="mono">{f.ticketNo}</TableCell>
                    <TableCell>
                      {f.charger}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {f.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip kind="ticket" value={f.status} />
                    </TableCell>
                    <TableCell>{f.technician ?? 'Unassigned'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {f.downtimeHours} h
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ReportCard>
        </Grid>
      </Grid>
    </>
  );
}
