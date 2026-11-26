export const SITE = {
  name: 'Charge Hub',
  tagline: 'Green Mobility',
  supportEmail: 'support@chargehub.example',
  supportPhone: '1800 000 0000',
  city: 'Bengaluru, India',
};

export const PUBLIC_NAV = [
  { label: 'Find a charger', section: 'find' },
  { label: 'Host a charger', section: 'host' },
  { label: 'Platform', section: 'platform' },
  { label: 'Resources', section: 'resources' },
];

export const SUPPORT_CHANNELS = [
  { channel: 'On-site charging help', detail: SITE.supportPhone, hours: '24 × 7, every day', note: 'For a charger that will not start or stop' },
  { channel: 'Email support', detail: SITE.supportEmail, hours: 'Reply within 1 business day', note: 'Billing, invoices and account questions' },
  { channel: 'In-app help & support', detail: 'Help & support page', hours: 'Mon – Sat, 9:00 – 18:00 IST', note: 'Answered by our operations manager after you sign in' },
];

export const LIMITATIONS = [
  'Payments run through a mock gateway in this release, so no real money moves.',
  'Energy delivered is simulated from charger power and time, not read from a live meter.',
  'Slots can be booked up to 7 days ahead, and each driver can hold at most 2 upcoming bookings.',
  'A booking is released automatically if charging has not started 15 minutes after the slot begins.',
  'Bharat AC-001 shares 10 kW across three 3.3 kW guns, so it is slower than Type 2 or DC chargers.',
];
