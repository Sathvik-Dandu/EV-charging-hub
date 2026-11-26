import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Card, CardActionArea, CardContent, Grid, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { CONNECTOR_SPECS } from '../../config/connectors';
import { LIMITATIONS, SUPPORT_CHANNELS } from '../../config/site';
import { brand } from '../../theme/palette';

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.tealDark }}>
      {children}
    </Typography>
  );
}

export function SectionHeading({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <Box sx={{ mb: 4, maxWidth: 720 }}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Typography variant="h3" component="h2" sx={{ mt: 1, fontSize: { xs: 30, md: 40 } }}>
        {title}
      </Typography>
      {intro && (
        <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: 17 }}>
          {intro}
        </Typography>
      )}
    </Box>
  );
}

export function PageIntro({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children?: ReactNode }) {
  return (
    <Box sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 5, md: 7 }, textAlign: 'center' }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Typography variant="h1" sx={{ fontSize: { xs: 40, md: 64 }, mt: 1.5, maxWidth: 820, mx: 'auto' }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ fontSize: { xs: 17, md: 19 }, mt: 2, maxWidth: 640, mx: 'auto' }}>
        {intro}
      </Typography>
      {children && <Box sx={{ mt: 4 }}>{children}</Box>}
    </Box>
  );
}

export function IntentCard({ title, text, to }: { title: string; text: string; to: string }) {
  return (
    <Card sx={{ height: '100%', transition: 'background .2s, border-color .2s', '&:hover': { bgcolor: brand.mist, borderColor: brand.sage } }}>
      <CardActionArea component={RouterLink} to={to} sx={{ height: '100%', p: 1 }}>
        <CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="h6">{title}</Typography>
            <ArrowOutwardRounded sx={{ color: brand.tealDark }} />
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {text}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function SpecTable() {
  return (
    <TableContainer component={Card}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: brand.mist }}>
            <TableCell sx={{ fontWeight: 700 }}>Charger type</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Current</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Listed specification</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(CONNECTOR_SPECS).map(([key, spec]) => (
            <TableRow key={key}>
              <TableCell sx={{ fontWeight: 600 }}>{spec.label}</TableCell>
              <TableCell>
                <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 999, fontSize: 12, fontWeight: 700, bgcolor: spec.current === 'DC' ? brand.navy : brand.sage, color: spec.current === 'DC' ? brand.white : brand.navy }}>
                  {spec.current}
                </Box>
              </TableCell>
              <TableCell>{spec.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function SupportChannels({ stacked = false }: { stacked?: boolean }) {
  return (
    <Grid container spacing={2}>
      {SUPPORT_CHANNELS.map((c) => (
        <Grid key={c.channel} size={{ xs: 12, md: stacked ? 12 : 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1">{c.channel}</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 600, mt: 1 }}>{c.detail}</Typography>
              <Typography sx={{ color: brand.tealDark, fontWeight: 600, mt: 0.5 }}>{c.hours}</Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                {c.note}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export function Limitations() {
  return (
    <Card sx={{ bgcolor: brand.mist, borderColor: brand.mist }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={1.75}>
          {LIMITATIONS.map((l) => (
            <Stack key={l} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <InfoOutlined sx={{ color: brand.sageDark, mt: 0.25 }} fontSize="small" />
              <Typography>{l}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <Stack spacing={1.5}>
      {items.map((item) => (
        <Stack key={item} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: brand.teal, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <CheckRounded sx={{ fontSize: 16, color: brand.navy }} />
          </Box>
          <Typography>{item}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <Grid container spacing={2}>
      {steps.map((s, i) => (
        <Grid key={s.title} size={{ xs: 12, md: 12 / steps.length }}>
          <Box sx={{ p: 3, borderRadius: 4, border: `1px solid ${brand.mist}`, height: '100%' }}>
            <Typography className="mono" sx={{ color: brand.tealDark, fontWeight: 700 }}>
              0{i + 1}
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {s.title}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {s.text}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
