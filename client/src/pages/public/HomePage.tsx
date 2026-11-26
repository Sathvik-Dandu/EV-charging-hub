import { useEffect, useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, CardContent, Container, Grid, InputBase, Paper, Stack, Typography } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { stationApi } from '../../api/endpoints';
import FloatingTiles from '../../components/public/FloatingTiles';
import FindChargers from '../../components/public/FindChargers';
import { CheckList, Limitations, SectionHeading, SpecTable, Steps, SupportChannels } from '../../components/public/Blocks';
import { BUSINESS_RULES_TEXT, FAQS, ROLE_FEATURES } from './content';
import { brand } from '../../theme/palette';

const sectionSx = { py: { xs: 7, md: 10 }, scrollMarginTop: '80px' };

export default function HomePage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const { data: stations = [] } = useQuery({ queryKey: ['stations', 'public', 'all'], queryFn: () => stationApi.search({}) });

  const chargers = stations.flatMap((s) => s.chargers);
  const cities = new Set(stations.map((s) => s.city)).size;
  const available = chargers.filter((c) => c.status === 'AVAILABLE').length;

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [hash]);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const match = stations.find((s) => s.city.toLowerCase() === query.trim().toLowerCase());
    setCity(match?.city ?? query.trim());
    navigate('/#find');
  };

  return (
    <>
      <Box component="section" sx={{ position: 'relative', minHeight: { xs: 'auto', md: 'calc(100vh - 76px)' }, display: 'grid', placeItems: 'center', py: { xs: 8, md: 0 } }}>
        <FloatingTiles />
        <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 700, letterSpacing: '0.08em', fontSize: 20 }}>CHARGE HUB</Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: 46, sm: 64, md: 88 }, mt: 2 }}>
            Charging,
            <br />
            without the guesswork
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: 17, md: 20 }, mt: 3, maxWidth: 560, mx: 'auto' }}>
            Live charger availability, conflict-free slot booking and transparent per-kWh pricing for EV drivers and station owners.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'center', mt: 4 }}>
            <Button component={RouterLink} to="/#find" variant="contained" size="large">
              Find a charger
            </Button>
            <Button component={RouterLink} to="/#host" variant="outlined" size="large">
              Host a charger
            </Button>
          </Stack>
          <Paper
            component="form"
            onSubmit={search}
            elevation={0}
            role="search"
            sx={{ mt: 5, mx: 'auto', maxWidth: 520, display: 'flex', alignItems: 'center', gap: 1, pl: 2.5, pr: 1, py: 0.75, borderRadius: 999, border: `1px solid ${brand.mist}`, boxShadow: '0 12px 32px -18px rgba(0,3,45,.3)' }}
          >
            <SearchRounded sx={{ color: brand.navySoft }} />
            <InputBase
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'Bengaluru' or 'Hyderabad'"
              inputProps={{ 'aria-label': 'Search stations by city' }}
              sx={{ flex: 1, fontSize: 16 }}
            />
            <Button type="submit" variant="contained" color="secondary" sx={{ color: brand.navy }}>
              Search
            </Button>
          </Paper>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Box component="section" id="find" sx={sectionSx}>
          <SectionHeading eyebrow="Find a charger" title="Stations near your route" intro="Live status for every charger. Booking needs a free EV driver account." />
          <FindChargers key={city} city={city} />
          <Grid container spacing={2} sx={{ mt: 4 }}>
            {[
              { label: 'Stations', value: stations.length },
              { label: 'Chargers', value: chargers.length },
              { label: 'Cities', value: cities },
              { label: 'Available right now', value: available },
            ].map((s) => (
              <Grid key={s.label} size={{ xs: 6, md: 3 }}>
                <Box sx={{ p: 3, borderRadius: 4, bgcolor: brand.mist }}>
                  <Typography sx={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em' }}>{s.value}</Typography>
                  <Typography color="text.secondary">{s.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 6 }}>
            <Steps
              steps={[
                { title: 'Find', text: 'Filter stations by city and connector. Status updates live as chargers change.' },
                { title: 'Book', text: 'Pick a 30–120 minute slot. We check your connector and block double bookings.' },
                { title: 'Charge & pay', text: 'Start with your booking reference. The invoice splits peak, off-peak and idle time.' },
              ]}
            />
          </Box>
        </Box>

        <Box component="section" id="host" sx={sectionSx}>
          <Box sx={{ p: { xs: 4, md: 7 }, borderRadius: 6, bgcolor: brand.navy, color: brand.white }}>
            <Grid container spacing={5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', color: brand.teal }}>HOST A CHARGER</Typography>
                <Typography variant="h3" component="h2" sx={{ mt: 1, fontSize: { xs: 30, md: 42 } }}>
                  Put your parking space on the map
                </Typography>
                <Typography sx={{ mt: 2, opacity: 0.85, fontSize: 17 }}>
                  Sign up as a station owner. Once an administrator approves your request, you add your stations and chargers yourself, and drivers can book them right away.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
                  <Button component={RouterLink} to="/register?role=STATION_OWNER" variant="contained" color="secondary" size="large" sx={{ color: brand.navy }}>
                    Sign up as a station owner
                  </Button>
                  <Button component={RouterLink} to="/login" variant="outlined" size="large" sx={{ color: brand.white, borderColor: 'rgba(255,255,255,.4)', '&:hover': { borderColor: brand.white, bgcolor: 'rgba(255,255,255,.08)' } }}>
                    Station owner sign in
                  </Button>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2.5}>
                  {[
                    ['1. Request', 'Sign up with your business name. The administrator reviews and approves your account.'],
                    ['2. List', 'Add each station with address and hours, then add chargers that meet the spec for their type and set your price per kWh for each charging type.'],
                    ['3. Operate', 'See bookings, live sessions and invoices at your stations. Report faults and the manager sends a technician.'],
                  ].map(([title, text]) => (
                    <Box key={title} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,.07)' }}>
                      <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
                      <Typography sx={{ opacity: 0.8, mt: 0.5 }}>{text}</Typography>
                    </Box>
                  ))}
                  <Typography sx={{ opacity: 0.7, fontSize: 14 }}>
                    Site needs: three-phase supply for Type 2 AC or Bharat AC-001, spare transformer capacity for DC fast chargers (50 kW+), mobile data at the bays.
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Box>

        <Box component="section" id="platform" sx={sectionSx}>
          <SectionHeading eyebrow="The platform" title="One platform, five clear roles" intro="Each person sees only the screens and actions their role is responsible for." />
          <Grid container spacing={2}>
            {ROLE_FEATURES.map((r) => (
              <Grid key={r.role} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {r.role}
                    </Typography>
                    <CheckList items={r.items} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card sx={{ height: '100%', bgcolor: brand.mist, borderColor: brand.mist }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6">Ready to start?</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Create a free EV driver account, or request a station owner or technician account.
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 3 }}>
                    <Button component={RouterLink} to="/register" variant="contained">
                      Sign up
                    </Button>
                    <Button component={RouterLink} to="/login" variant="outlined">
                      Sign in
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        <Box component="section" id="resources" sx={sectionSx}>
          <SectionHeading eyebrow="Resources" title="Transparent specs, pricing and policies" />
          <SpecTable />

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6">How your bill is calculated</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Example prices: ₹18/kWh normal, ₹24/kWh peak (18:00–22:00), idle ₹5/min after {BUSINESS_RULES_TEXT.idleGrace} free.
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {[
                      ['10 kWh before 18:00', '10 × ₹18 = ₹180.00'],
                      ['10 kWh after 18:00', '10 × ₹24 = ₹240.00'],
                      ['Plugged in 15 min after full', '(15 − 10) × ₹5 = ₹25.00'],
                      ['GST 18%', '₹80.10'],
                    ].map(([k, v]) => (
                      <Stack key={k} direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                        <Typography>{k}</Typography>
                        <Typography sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{v}</Typography>
                      </Stack>
                    ))}
                    <Stack direction="row" sx={{ justifyContent: 'space-between', pt: 1, borderTop: `1px solid ${brand.mist}` }}>
                      <Typography variant="h6">Total</Typography>
                      <Typography variant="h6">₹525.10</Typography>
                    </Stack>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Each station owner sets their own prices per charging type. You see them on every station before you book.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Booking policy
                  </Typography>
                  <CheckList
                    items={[
                      `Slots are ${BUSINESS_RULES_TEXT.slotDurations} long, bookable up to ${BUSINESS_RULES_TEXT.advanceDays} ahead`,
                      `Hold up to ${BUSINESS_RULES_TEXT.maxUpcoming} at once`,
                      `Start up to ${BUSINESS_RULES_TEXT.earlyStart} before your slot`,
                      `Unstarted slots are released ${BUSINESS_RULES_TEXT.noShowGrace} after they begin`,
                      'Cancel or reschedule any time before the slot starts',
                      'Faulty chargers cannot be booked',
                    ]}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" component="h3" sx={{ mb: 2 }}>
              Common questions
            </Typography>
            {FAQS.map((f) => (
              <Accordion key={f.q} disableGutters elevation={0} sx={{ border: `1px solid ${brand.mist}`, '&:not(:last-of-type)': { borderBottom: 0 }, '&::before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                  <Typography sx={{ fontWeight: 600 }}>{f.q}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography color="text.secondary">{f.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>

          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" component="h3" sx={{ mb: 2 }}>
              Support hours & channels
            </Typography>
            <SupportChannels />
          </Box>

          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" component="h3" sx={{ mb: 2 }}>
              Honest limitations
            </Typography>
            <Limitations />
          </Box>
        </Box>
      </Container>
    </>
  );
}
