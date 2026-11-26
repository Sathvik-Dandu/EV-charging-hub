import { describe, expect, it } from 'vitest';
import { registerSchema, vehicleSchema } from './forms';
import { money, minutesToText } from '../utils/format';

describe('vehicle form validation', () => {
  it('accepts and normalises a valid registration number', () => {
    const result = vehicleSchema.safeParse({ registrationNo: 'ka 01 ab 1234', make: 'Tata', model: 'Nexon EV', connectorType: 'CCS2', batteryKwh: '40.5' });
    expect(result.success).toBe(true);
    expect(result.data?.registrationNo).toBe('KA01AB1234');
  });

  it('rejects an invalid registration number', () => {
    const result = vehicleSchema.safeParse({ registrationNo: '1234', make: 'Tata', model: 'Nexon', connectorType: 'CCS2', batteryKwh: '40' });
    expect(result.success).toBe(false);
  });
});

describe('register form validation', () => {
  it('requires matching passwords', () => {
    const result = registerSchema.safeParse({ fullName: 'Asha Verma', email: 'asha@mail.com', password: 'Password@1', confirmPassword: 'Password@2' });
    expect(result.success).toBe(false);
  });
});

describe('formatters', () => {
  it('formats rupees and durations', () => {
    expect(money(1234.5)).toBe('₹1,234.50');
    expect(minutesToText(95)).toBe('1h 35m');
  });
});
