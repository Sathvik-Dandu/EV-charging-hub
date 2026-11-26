export const BUSINESS_RULES_TEXT = {
  maxUpcoming: '2 upcoming bookings',
  noShowGrace: '15 minutes',
  idleGrace: '10 minutes',
  slotDurations: '30, 60, 90 or 120 minutes',
  advanceDays: '7 days',
  earlyStart: '30 minutes',
};

export const FAQS = [
  {
    q: 'How do I list my charging station?',
    a: 'Sign up as a station owner. Once an administrator approves your request, sign in and add your stations, chargers and prices. They appear in search straight away.',
  },
  {
    q: 'Do I need an account to find a charger?',
    a: 'No. Anyone can search stations and see live status. You need a free driver account to book a slot and start a session.',
  },
  {
    q: 'What happens if I am late for my slot?',
    a: `You can start charging up to ${BUSINESS_RULES_TEXT.noShowGrace} after the slot begins. After that the slot is released automatically so another driver can use it.`,
  },
  {
    q: 'Can I book a charger that does not match my car?',
    a: 'No. The booking only goes through when the charger connector matches the connector saved on your vehicle.',
  },
  {
    q: 'How is peak pricing applied?',
    a: 'Each station owner sets a price per kWh for every charging type, plus a higher peak-hour price. Energy delivered during peak hours is billed at the peak price and the rest at the normal price, minute by minute.',
  },
  {
    q: 'What if a charger is faulty?',
    a: 'Report it from the station card. The charger is taken offline immediately, upcoming bookings on it are cancelled, and the operations manager assigns a technician.',
  },
  {
    q: 'Can I walk in without a booking?',
    a: 'Yes, if the charger is free and nobody has booked it for the next hour.',
  },
];

export const ROLE_FEATURES = [
  {
    role: 'EV owners',
    items: ['Register vehicles with connector type and battery size', 'Book compatible slots, start and stop charging', 'Pay invoices, report faults, ask for help'],
  },
  {
    role: 'Station owners',
    items: ['Sign up and get approved by the administrator', 'Add your stations, chargers and prices per charging type', 'See bookings, sessions and invoices at your stations; run on-site sessions'],
  },
  {
    role: 'Maintenance technicians',
    items: ['Sign up and get approved by the administrator', 'Work queue of tickets assigned by the manager', 'Resolving a ticket puts the charger back online'],
  },
  {
    role: 'Network administrators',
    items: ['Review station owner and technician sign-up requests', 'Manage users and roles', 'Oversee every station and charger'],
  },
  {
    role: 'Operations managers',
    items: ['Utilization, revenue, fault and booking reports', 'Assign maintenance tickets to technicians', 'Answer help & support enquiries'],
  },
];
