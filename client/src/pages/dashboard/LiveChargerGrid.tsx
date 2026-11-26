import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Stack, Tooltip, Typography, alpha } from '@mui/material';
import { chargerApi } from '../../api/endpoints';
import { chargerStatusColors } from '../../theme/palette';
import { label } from '../../utils/format';
import { connectorLabel } from '../../config/connectors';
import type { Charger } from '../../api/types';

export default function LiveChargerGrid() {
  const { data = [] } = useQuery({ queryKey: ['chargers'], queryFn: chargerApi.list });
  const byStation = data.reduce<Record<string, Charger[]>>((acc, c) => {
    const key = c.station?.name ?? 'Unknown';
    (acc[key] ??= []).push(c);
    return acc;
  }, {});

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1">
          Live charger status
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Updates instantly whenever a charger changes state
        </Typography>
        {data.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 3 }}>
            No chargers yet. They appear here as soon as station owners add them.
          </Typography>
        )}
        <Stack spacing={1.5}>
          {Object.entries(byStation).map(([station, chargers]) => (
            <Stack key={station} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" noWrap sx={{ width: 190, flexShrink: 0, fontWeight: 600 }}>
                {station}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {chargers.map((c) => {
                  const color = chargerStatusColors[c.status];
                  return (
                    <Tooltip key={c.id} title={`${c.code} · ${connectorLabel(c.connectorType)} · ${c.powerKw} kW · ${label(c.status)}`}>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1.5,
                          fontSize: 11,
                          fontWeight: 800,
                          color,
                          bgcolor: alpha(color, 0.12),
                          border: `1px solid ${alpha(color, 0.35)}`,
                          animation: c.status === 'CHARGING' ? 'evPulse 1.6s ease-in-out infinite' : 'none',
                        }}
                        className="mono"
                      >
                        {c.code.split('-').pop()} · {c.powerKw}kW
                      </Box>
                    </Tooltip>
                  );
                })}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
