import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import EvStationRounded from '@mui/icons-material/EvStationRounded';
import BoltRounded from '@mui/icons-material/BoltRounded';
import EnergySavingsLeafRounded from '@mui/icons-material/EnergySavingsLeafRounded';
import ElectricCarRounded from '@mui/icons-material/ElectricCarRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import { brand } from '../../theme/palette';

interface Tile {
  x: string;
  y: string;
  w: number;
  h: number;
  r: number;
  faded?: boolean;
  bg: string;
  content: ReactNode;
}

const icon = (node: ReactNode) => <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', '& svg': { fontSize: 38 } }}>{node}</Box>;

const TILES: Tile[] = [
  { x: '4%', y: '14%', w: 120, h: 92, r: -14, bg: `linear-gradient(135deg, ${brand.teal}, ${brand.tealDark})`, content: icon(<EvStationRounded sx={{ color: brand.white }} />) },
  { x: '22%', y: '6%', w: 104, h: 104, r: 12, bg: `linear-gradient(160deg, ${brand.sage}, #8EA383)`, content: icon(<EnergySavingsLeafRounded sx={{ color: brand.white }} />) },
  { x: '9%', y: '46%', w: 128, h: 92, r: 6, bg: brand.white, content: <Spec label="CCS2" value="60 kW" /> },
  { x: '20%', y: '34%', w: 96, h: 80, r: -8, faded: true, bg: `linear-gradient(135deg, ${brand.sage}, ${brand.mist})`, content: null },
  { x: '6%', y: '74%', w: 104, h: 76, r: -10, bg: `linear-gradient(135deg, ${brand.navy}, #1B1E52)`, content: icon(<BoltRounded sx={{ color: brand.teal }} />) },
  { x: '21%', y: '64%', w: 64, h: 84, r: 14, faded: true, bg: brand.mist, content: null },
  { x: '78%', y: '10%', w: 112, h: 84, r: 16, bg: `linear-gradient(135deg, ${brand.navy}, #23275E)`, content: <Battery /> },
  { x: '66%', y: '26%', w: 76, h: 76, r: -6, faded: true, bg: `linear-gradient(135deg, ${brand.teal}, ${brand.mist})`, content: null },
  { x: '86%', y: '34%', w: 104, h: 116, r: 8, bg: brand.mist, content: <MapTile /> },
  { x: '79%', y: '58%', w: 132, h: 88, r: -12, bg: brand.white, content: <Price /> },
  { x: '68%', y: '72%', w: 96, h: 72, r: 10, bg: `linear-gradient(135deg, ${brand.sage}, #9DB092)`, content: icon(<ElectricCarRounded sx={{ color: brand.navy }} />) },
  { x: '88%', y: '78%', w: 84, h: 84, r: -16, bg: `linear-gradient(135deg, ${brand.teal}, ${brand.tealDark})`, content: icon(<ScheduleRounded sx={{ color: brand.white }} />) },
];

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: brand.teal }} />
        <Typography sx={{ fontSize: 11, color: brand.navySoft, fontWeight: 600 }}>Available</Typography>
      </Box>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: brand.navy, mt: 1 }}>{label}</Typography>
      <Typography className="mono" sx={{ fontSize: 12, color: brand.navySoft }}>
        {value}
      </Typography>
    </Box>
  );
}

function Battery() {
  return (
    <Box sx={{ p: 1.5, color: brand.white }}>
      <Typography sx={{ fontSize: 11, opacity: 0.7 }}>Charging</Typography>
      <Typography className="mono" sx={{ fontSize: 20, fontWeight: 700, color: brand.teal }}>
        78%
      </Typography>
      <Box sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,.15)' }}>
        <Box sx={{ width: '78%', height: '100%', borderRadius: 3, bgcolor: brand.teal }} />
      </Box>
    </Box>
  );
}

function Price() {
  return (
    <Box sx={{ p: 1.5 }}>
      <Typography sx={{ fontSize: 11, color: brand.navySoft, fontWeight: 600 }}>CCS2 price</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700, color: brand.navy }}>₹18 / kWh</Typography>
      <Typography sx={{ fontSize: 11, color: brand.tealDark, fontWeight: 600 }}>No hidden fees</Typography>
    </Box>
  );
}

function MapTile() {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        backgroundImage: `linear-gradient(${brand.white} 1px, transparent 1px), linear-gradient(90deg, ${brand.white} 1px, transparent 1px)`,
        backgroundSize: '16px 16px',
      }}
    >
      <PlaceRounded sx={{ fontSize: 40, color: brand.tealDark }} />
    </Box>
  );
}

export default function FloatingTiles({ subtle = false }: { subtle?: boolean }) {
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', display: { xs: 'none', md: 'block' } }}>
      {TILES.map((t, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            left: t.x,
            top: t.y,
            width: t.w,
            height: t.h,
            borderRadius: '16px',
            overflow: 'hidden',
            background: t.bg,
            border: `1px solid ${brand.mist}`,
            boxShadow: t.faded ? 'none' : '0 18px 40px -18px rgba(0,3,45,.25)',
            opacity: subtle ? 0.35 : t.faded ? 0.4 : 1,
            filter: t.faded ? 'blur(1.5px)' : 'none',
            '--r': `${t.r}deg`,
            transform: `rotate(${t.r}deg)`,
            animation: `evFloat ${6 + (i % 4)}s ease-in-out ${i * 0.4}s infinite`,
          }}
        >
          {t.content}
        </Box>
      ))}
    </Box>
  );
}
