import { Box, Typography } from '@mui/material';
import { brand } from '../../theme/palette';
import { SITE } from '../../config/site';

export function LogoMark({ size = 28 }: { size?: number }) {
  const dots = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3 - Math.PI / 2;
    return { cx: 16 + Math.cos(angle) * 10, cy: 16 + Math.sin(angle) * 10 };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={4.2} fill={brand.navy} />
      ))}
      <circle cx={16} cy={16} r={4.6} fill={brand.teal} />
    </svg>
  );
}

export default function Logo({ showName = true }: { showName?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }} aria-label={SITE.name}>
      <LogoMark />
      {showName && (
        <Typography component="span" sx={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: brand.navy }}>
          {SITE.name}
        </Typography>
      )}
    </Box>
  );
}
