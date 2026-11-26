import { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Box, Button, Container, Divider, Drawer, Grid, IconButton, Link, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import Logo from '../layout/Logo';
import { PUBLIC_NAV, SITE } from '../../config/site';
import { brand } from '../../theme/palette';

const navLinkSx = {
  color: brand.navySoft,
  fontWeight: 500,
  fontSize: 15,
  px: 1.25,
  py: 0.75,
  minWidth: 0,
  borderRadius: 999,
  '&:hover': { color: brand.navy, bgcolor: brand.mist },
};

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const goTo = (section: string) => {
    setOpen(false);
    const el = document.getElementById(section);
    if (pathname === '/' && el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    navigate(`/#${section}`);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: brand.white }}>
      <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'rgba(255,255,255,.88)', backdropFilter: 'blur(12px)' }}>
        <Container maxWidth="xl" sx={{ display: 'flex', alignItems: 'center', gap: 3, height: 76 }}>
          <Box component={RouterLink} to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} sx={{ textDecoration: 'none' }} aria-label="Charge Hub home">
            <Logo />
          </Box>
          <Stack component="nav" direction="row" spacing={0.5} sx={{ display: { xs: 'none', lg: 'flex' } }} aria-label="Main">
            {PUBLIC_NAV.map((item) => (
              <Button key={item.section} onClick={() => goTo(item.section)} sx={navLinkSx}>
                {item.label}
              </Button>
            ))}
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', display: { xs: 'none', md: 'flex' } }}>
            <Button component={RouterLink} to="/login" sx={navLinkSx}>
              Sign in
            </Button>
            <Button component={RouterLink} to="/register" variant="contained" size="large">
              Sign up
            </Button>
          </Stack>
          <IconButton sx={{ display: { lg: 'none' } }} onClick={() => setOpen(true)} aria-label="Open menu">
            <MenuRounded />
          </IconButton>
        </Container>
      </Box>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: { width: 300, p: 2 } } }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Logo />
          <IconButton onClick={() => setOpen(false)} aria-label="Close menu">
            <CloseRounded />
          </IconButton>
        </Stack>
        <List>
          {PUBLIC_NAV.map((item) => (
            <ListItemButton key={item.section} onClick={() => goTo(item.section)} sx={{ borderRadius: 3 }}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Stack spacing={1} sx={{ mt: 'auto' }}>
          <Button component={RouterLink} to="/register" variant="contained" size="large">
            Sign up
          </Button>
          <Button component={RouterLink} to="/login" variant="outlined" size="large">
            Sign in
          </Button>
        </Stack>
      </Drawer>

      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      <Box component="footer" sx={{ borderTop: `1px solid ${brand.mist}` }}>
        <Container maxWidth="lg" sx={{ py: 7 }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Logo />
              <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 320 }}>
                Find, book and pay for EV charging, and list your own stations, with transparent specs and pricing.
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Explore
              </Typography>
              <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                {PUBLIC_NAV.map((item) => (
                  <Link key={item.section} component="button" onClick={() => goTo(item.section)} color="text.secondary">
                    {item.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Account
              </Typography>
              <Stack spacing={1}>
                <Link component={RouterLink} to="/register" color="text.secondary">
                  Sign up
                </Link>
                <Link component={RouterLink} to="/register?role=STATION_OWNER" color="text.secondary">
                  Become a station owner
                </Link>
                <Link component={RouterLink} to="/login" color="text.secondary">
                  Sign in
                </Link>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Support
              </Typography>
              <Stack spacing={1} sx={{ color: 'text.secondary' }}>
                <Typography variant="body2">{SITE.supportPhone}</Typography>
                <Typography variant="body2">{SITE.supportEmail}</Typography>
                <Typography variant="body2">On-site help 24 × 7</Typography>
              </Stack>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4 }} />
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} {SITE.name} · {SITE.tagline}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
