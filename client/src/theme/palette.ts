export const brand = {
  white: '#FFFFFF',
  navy: '#00032D',
  teal: '#00BF9F',
  sage: '#B2C2A7',
  mist: '#E6ECF0',
  navySoft: '#4A4D6B',
  tealDark: '#008F77',
  sageDark: '#5E7356',
  danger: '#D93F4C',
  warning: '#C98A12',
};

export const chargerStatusColors: Record<string, string> = {
  AVAILABLE: brand.tealDark,
  RESERVED: brand.sageDark,
  CHARGING: brand.navy,
  FAULTY: brand.danger,
};

export const bookingStatusColors: Record<string, string> = {
  CONFIRMED: brand.navy,
  IN_PROGRESS: brand.tealDark,
  COMPLETED: brand.sageDark,
  CANCELLED: brand.navySoft,
  NO_SHOW: brand.warning,
};

export const ticketStatusColors: Record<string, string> = {
  OPEN: brand.danger,
  IN_PROGRESS: brand.warning,
  RESOLVED: brand.tealDark,
};

export const priorityColors: Record<string, string> = {
  LOW: brand.navySoft,
  MEDIUM: brand.warning,
  HIGH: brand.danger,
};

export const enquiryStatusColors: Record<string, string> = {
  NEW: brand.danger,
  IN_PROGRESS: brand.warning,
  RESOLVED: brand.tealDark,
};
