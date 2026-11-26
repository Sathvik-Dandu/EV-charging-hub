import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import Logo from '../components/layout/Logo';
import FloatingTiles from '../components/public/FloatingTiles';
import { brand } from '../theme/palette';

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', bgcolor: brand.white, display: 'flex', flexDirection: 'column' }}>
      <FloatingTiles subtle />
      <Stack direction="row" sx={{ position: 'relative', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 4 }, height: 76 }}>
        <Box component={RouterLink} to="/" sx={{ textDecoration: 'none' }} aria-label="Charge Hub home">
          <Logo />
        </Box>
        <Button component={RouterLink} to="/" startIcon={<ArrowBackRounded />} color="inherit">
          Back to site
        </Button>
      </Stack>
      <Box sx={{ position: 'relative', flex: 1, display: 'grid', placeItems: 'center', px: 2, py: 4 }}>
        <Paper variant="outlined" sx={{ width: '100%', maxWidth: 440, p: { xs: 3, sm: 4.5 }, borderRadius: 6, boxShadow: '0 30px 60px -30px rgba(0,3,45,.25)' }}>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, mt: 0.75 }}>
            {subtitle}
          </Typography>
          {children}
        </Paper>
      </Box>
    </Box>
  );
}
