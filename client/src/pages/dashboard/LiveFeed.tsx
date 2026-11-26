import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import BoltRounded from '@mui/icons-material/BoltRounded';
import { useAppSelector } from '../../app/store';
import { bookingStatusColors, brand, chargerStatusColors, ticketStatusColors } from '../../theme/palette';
import { timeOnly } from '../../utils/format';

export default function LiveFeed() {
  const events = useAppSelector((s) => s.ui.liveEvents);
  const colorFor = (status?: string) =>
    (status && (chargerStatusColors[status] ?? bookingStatusColors[status] ?? ticketStatusColors[status])) || brand.navySoft;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1">
          Live activity
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Real-time events from the network
        </Typography>
        {events.length === 0 ? (
          <Stack sx={{ alignItems: 'center', py: 5, color: 'text.secondary' }}>
            <BoltRounded sx={{ fontSize: 40, opacity: 0.4 }} />
            <Typography variant="body2">Waiting for network events…</Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {events.map((e) => (
              <Stack key={e.id} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <Box sx={{ width: 8, height: 8, mt: 0.8, borderRadius: '50%', bgcolor: colorFor(e.status), flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {e.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {timeOnly(e.at)}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
