import { Link as RouterLink, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { AppBar, Avatar, Box, Button, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { setSidebar } from '../../features/uiSlice';
import { loggedOut } from '../../features/authSlice';
import { authApi } from '../../api/endpoints';
import { NAV_ITEMS, ROLE_LABELS, navLabel } from '../../config/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { can } from '../../config/permissions';
import { brand } from '../../theme/palette';
import { useRealtime } from '../../hooks/useRealtime';
import Logo from './Logo';

const DRAWER_WIDTH = 256;

export default function AppLayout() {
  useRealtime();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('lg'));
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user)!;
  const { sidebarOpen, socketConnected } = useAppSelector((s) => s.ui);

  const items = NAV_ITEMS.filter((item) => can(user.role, item.permission));
  const current = items.find((i) => location.pathname.startsWith(i.path));

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    dispatch(loggedOut());
    queryClient.clear();
    navigate('/login', { replace: true, state: {} });
  };

  const sidebar = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, borderRight: `1px solid ${brand.mist}` }}>
      <Box component={RouterLink} to="/" sx={{ px: 1, py: 1.5, textDecoration: 'none' }}>
        <Logo />
      </Box>
      <List component="nav" aria-label="App" sx={{ flex: 1, mt: 2 }}>
        {items.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              onClick={() => dispatch(setSidebar(false))}
              sx={{
                borderRadius: 999,
                mb: 0.5,
                px: 2,
                color: active ? brand.white : brand.navySoft,
                bgcolor: active ? brand.navy : 'transparent',
                '&:hover': { bgcolor: active ? brand.navy : brand.mist },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: active ? brand.teal : 'inherit' }}>
                <item.icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={navLabel(item, user.role)} slotProps={{ primary: { sx: { fontWeight: active ? 600 : 500, fontSize: 14.5 } } }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 1.5, borderRadius: 4, bgcolor: brand.mist, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: brand.teal, color: brand.navy, width: 36, height: 36, fontWeight: 700 }}>{user.fullName[0]}</Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>
            {user.fullName}
          </Typography>
          <Typography noWrap sx={{ fontSize: 12, color: brand.navySoft }}>
            {ROLE_LABELS[user.role]}
          </Typography>
        </Box>
        <Tooltip title="Log out">
          <IconButton size="small" onClick={logout} aria-label="log out">
            <LogoutRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: brand.white }}>
      <Drawer
        variant={desktop ? 'permanent' : 'temporary'}
        open={desktop || sidebarOpen}
        onClose={() => dispatch(setSidebar(false))}
        sx={{ width: { lg: DRAWER_WIDTH }, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 0 } }}
      >
        {sidebar}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(10px)', color: 'text.primary', borderBottom: `1px solid ${brand.mist}` }}>
          <Toolbar sx={{ gap: 1.5 }}>
            {!desktop && (
              <IconButton onClick={() => dispatch(setSidebar(true))} edge="start" aria-label="open menu">
                <MenuRounded />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flex: 1 }} noWrap>
              {current ? navLabel(current, user.role) : 'Charge Hub'}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 1.5, py: 0.5, borderRadius: 5, bgcolor: brand.mist }} aria-live="polite">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: socketConnected ? brand.teal : brand.danger, animation: socketConnected ? 'evPulse 1.6s infinite' : 'none' }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {socketConnected ? 'Live' : 'Offline'}
              </Typography>
            </Stack>
            <Button component={RouterLink} to="/" endIcon={<OpenInNewRounded fontSize="small" />} color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              View site
            </Button>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
