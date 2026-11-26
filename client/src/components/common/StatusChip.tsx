import { Chip, alpha } from '@mui/material';
import { bookingStatusColors, brand, chargerStatusColors, enquiryStatusColors, priorityColors, ticketStatusColors } from '../../theme/palette';
import { label } from '../../utils/format';

const palettes = {
  charger: chargerStatusColors,
  booking: bookingStatusColors,
  ticket: ticketStatusColors,
  priority: priorityColors,
  enquiry: enquiryStatusColors,
  approval: { APPROVED: brand.tealDark, PENDING: brand.warning, REJECTED: brand.danger } as Record<string, string>,
  payment: { PAID: brand.tealDark, PENDING: brand.warning } as Record<string, string>,
};

interface Props {
  value: string;
  kind?: keyof typeof palettes;
  pulse?: boolean;
}

export default function StatusChip({ value, kind = 'charger', pulse }: Props) {
  const color = palettes[kind][value] ?? brand.navySoft;
  return (
    <Chip
      size="small"
      label={label(value)}
      sx={{
        color,
        bgcolor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.3)}`,
        '&::before': {
          content: '""',
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: color,
          ml: 1,
          animation: pulse || value === 'CHARGING' ? 'evPulse 1.4s ease-in-out infinite' : 'none',
        },
      }}
    />
  );
}
