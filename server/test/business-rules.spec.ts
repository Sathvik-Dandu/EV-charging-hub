import { describe, expect, it } from 'vitest';
import { calculateBill } from '../src/sessions/billing';
import { overlaps, validateSlot } from '../src/bookings/booking.rules';

const tariff = { energyRate: 18, peakRate: 24, peakStartHour: 18, peakEndHour: 22, idleFeePerMin: 5 };
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

describe('Billing (Rules 8, 9)', () => {
  it('charges off-peak rate outside peak hours', () => {
    const bill = calculateBill({ startedAt: at(10), durationMin: 60, energyKwh: 30, idleMinutes: 0, tariff });
    expect(bill.energyCost).toBe(540);
    expect(bill.peakCost).toBe(0);
    expect(bill.totalAmount).toBe(637.2);
  });

  it('splits energy across the peak boundary', () => {
    const bill = calculateBill({ startedAt: at(17, 30), durationMin: 60, energyKwh: 20, idleMinutes: 0, tariff });
    expect(bill.peakKwh).toBe(10);
    expect(bill.offPeakKwh).toBe(10);
  });

  it('applies no idle fee within the 10 minute grace period', () => {
    const bill = calculateBill({ startedAt: at(10), durationMin: 30, energyKwh: 10, idleMinutes: 10, tariff });
    expect(bill.idleFee).toBe(0);
  });

  it('charges idle fee only for minutes beyond the grace period', () => {
    const bill = calculateBill({ startedAt: at(10), durationMin: 30, energyKwh: 10, idleMinutes: 16, tariff });
    expect(bill.idleFee).toBe(30);
  });
});
