import { z } from 'zod';
import { CONNECTOR_SPECS } from '../config/connectors';

export const CONNECTORS = ['CCS2', 'CHADEMO', 'TYPE2', 'BHARAT_DC001', 'BHARAT_AC001'] as const;
export const SLOT_DURATIONS = [30, 60, 90, 120] as const;
export const ROLE_OPTIONS = ['ADMIN', 'EV_OWNER', 'STATION_OWNER', 'TECHNICIAN', 'MANAGER'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const PAYMENT_METHODS = ['UPI', 'CARD', 'WALLET'] as const;

export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
  { label: 'One special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const email = z.string().trim().toLowerCase().min(1, 'Email is required').pipe(z.email('Enter a valid email like name@example.com'));

const fullName = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .regex(/^[A-Za-z][A-Za-z .'-]{2,59}$/, 'Use 3-60 letters only');

const phone = z
  .string()
  .regex(/^\d*$/, 'Digits only')
  .refine((v) => v === '' || /^[6-9]/.test(v), 'Mobile number must start with 6, 7, 8 or 9')
  .refine((v) => v === '' || v.length === 10, 'Mobile number must be exactly 10 digits')
  .optional();

const strongPassword = z
  .string()
  .min(1, 'Password is required')
  .superRefine((value, ctx) => {
    const failed = PASSWORD_RULES.find((rule) => !rule.test(value));
    if (failed) ctx.addIssue({ code: 'custom', message: `Password needs ${failed.label.toLowerCase()}` });
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    fullName,
    email,
    phone,
    password: strongPassword,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['EV_OWNER', 'STATION_OWNER', 'TECHNICIAN']),
    organization: z.string().trim().max(100, 'Maximum 100 characters').optional(),
  })
  .refine((v) => v.role !== 'STATION_OWNER' || (v.organization ?? '').length >= 2, {
    message: 'Business name is required for station owners',
    path: ['organization'],
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
    when: (payload) => typeof (payload.value as { confirmPassword?: unknown }).confirmPassword === 'string',
  });

export const vehicleSchema = z.object({
  registrationNo: z
    .string()
    .transform((v) => v.toUpperCase().replace(/\s/g, ''))
    .pipe(z.string().regex(/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/, 'Format: KA01AB1234')),
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  connectorType: z.enum(CONNECTORS),
  batteryKwh: z.coerce.number<string>().min(5, 'Minimum 5 kWh').max(200, 'Maximum 200 kWh'),
});

export const bookingSchema = z.object({
  vehicleId: z.coerce.number<string>().positive('Select a vehicle'),
  chargerId: z.coerce.number<string>().positive('Select a charger'),
  date: z.string().min(1, 'Select a date'),
  time: z.string().min(1, 'Select a start time'),
  durationMinutes: z.coerce.number<string>(),
});

export const stationSchema = z.object({
  code: z.string().regex(/^[A-Z]{3}-\d{3}$/, 'Format: BLR-005'),
  name: z.string().min(3, 'Name is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  latitude: z.coerce.number<string>().min(-90).max(90),
  longitude: z.coerce.number<string>().min(-180).max(180),
  opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm'),
  closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm'),
});

const priceText = z.string().trim();

function checkPrice(ctx: z.RefinementCtx, path: (string | number)[], price: string, required: boolean) {
  if (!price) {
    if (required) ctx.addIssue({ code: 'custom', path, message: 'Price is required' });
    return;
  }
  const p = Number(price);
  if (Number.isNaN(p) || p < 1 || p > 100) ctx.addIssue({ code: 'custom', path, message: 'Enter ₹1–100 per kWh' });
}

export const chargerSchema = (pricedTypes: readonly string[] = []) => z
  .object({
    code: z.string().regex(/^[A-Z]{3}-\d{3}-C\d{1,2}$/, 'Format: BLR-005-C1'),
    connectorType: z.enum(CONNECTORS),
    powerKw: z.coerce.number<string>().positive('Enter the power rating'),
    pricePerKwh: priceText,
  })
  .superRefine((v, ctx) => {
    if (!pricedTypes.includes(v.connectorType)) checkPrice(ctx, ['pricePerKwh'], v.pricePerKwh, true);
    const spec = CONNECTOR_SPECS[v.connectorType];
    if (v.powerKw < spec.minKw || v.powerKw > spec.maxKw) {
      ctx.addIssue({
        code: 'custom',
        path: ['powerKw'],
        message: spec.minKw === spec.maxKw ? `${spec.label} is rated at exactly ${spec.minKw} kW` : `${spec.label} must be ${spec.minKw}–${spec.maxKw} kW`,
      });
    }
  });

export const pricesSchema = (typesInUse: readonly string[] = []) => z
  .object({ prices: z.record(z.enum(CONNECTORS), priceText) })
  .superRefine((v, ctx) => {
    for (const type of CONNECTORS) checkPrice(ctx, ['prices', type], v.prices[type] ?? '', typesInUse.includes(type));
  });

export const userSchema = z.object({
  fullName,
  email,
  phone,
  password: strongPassword,
  role: z.enum(ROLE_OPTIONS),
});

export const ticketSchema = z.object({
  chargerId: z.coerce.number<string>().positive('Select a charger'),
  title: z.string().min(5, 'Minimum 5 characters').max(100),
  description: z.string().min(10, 'Describe the fault in at least 10 characters'),
  priority: z.enum(PRIORITIES),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;

export const ENQUIRY_CATEGORIES = ['BOOKING', 'BILLING', 'CHARGER', 'ACCOUNT', 'OTHER'] as const;

export const enquirySchema = z.object({
  category: z.enum(ENQUIRY_CATEGORIES),
  subject: z.string().trim().min(5, 'Subject must have at least 5 characters').max(120, 'Maximum 120 characters'),
  message: z.string().trim().min(20, 'Tell us a little more (at least 20 characters)').max(1000, 'Maximum 1000 characters'),
});

export type EnquiryForm = z.infer<typeof enquirySchema>;
