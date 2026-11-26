import { describe, expect, it } from 'vitest';
import { calculateBill } from '../src/sessions/billing';
import { overlaps, validateSlot } from '../src/bookings/booking.rules';

const at = (h: number, m = 0) => new Date(2026, 10, 25, h, m);

describe('Overlap detection (Rule 2)', () => {
  it('detects overlapping slots', () => {
    expect(overlaps(at(10), at(11), at(10, 30), at(11, 30))).toBe(true);
  });
  it('allows back-to-back slots', () => {
    expect(overlaps(at(10), at(11), at(11), at(12))).toBe(false);
  });
});

describe('Slot validation', () => {
  const station = { opensAt: '06:00', closesAt: '22:00' };
  const now = at(8);
  it('rejects invalid durations', () => {
    expect(validateSlot(at(10), 45, station, now)).toMatch(/duration/);
  });
  it('rejects past slots', () => {
    expect(validateSlot(at(7), 60, station, now)).toMatch(/past/);
  });
  it('rejects slots outside operating hours', () => {
    expect(validateSlot(at(21, 30), 60, station, now)).toMatch(/operates/);
  });
  it('accepts a valid slot', () => {
    expect(validateSlot(at(10), 60, station, now)).toBeNull();
  });
});

describe('Billing: kWh x price + 18% GST', () => {
  it('multiplies energy by the price per kWh and adds GST', () => {
    const bill = calculateBill(30, 18);
    expect(bill.energyCost).toBe(540);
    expect(bill.taxAmount).toBe(97.2);
    expect(bill.totalAmount).toBe(637.2);
  });

  it('uses the price of the charging type that was used', () => {
    expect(calculateBill(12, 20).totalAmount).toBe(283.2);
    expect(calculateBill(12, 14).totalAmount).toBe(198.24);
  });

  it('charges nothing when no energy was delivered', () => {
    expect(calculateBill(0, 18).totalAmount).toBe(0);
  });
});
