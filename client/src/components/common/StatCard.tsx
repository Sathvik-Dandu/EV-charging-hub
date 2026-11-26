import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { brand } from '../../theme/palette';

interface Props {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  caption?: ReactNode;
}

export default function StatCard({ title, value, icon, caption }: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', color: brand.navy, bgcolor: brand.mist, flexShrink: 0 }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, mt: 0.25 }}>{value}</Typography>
          {caption && (
            <Typography variant="caption" color="text.secondary">
              {caption}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
