import { describe, expect, it } from 'vitest';
import { chargerPowerError, peakHoursError, priceError } from '../src/chargers/charger.rules';
import { can } from '../src/common/permissions';

describe('Charger power specifications', () => {
  it('requires CCS2 and CHAdeMO fast chargers to be at least 50 kW', () => {
    expect(chargerPowerError('CCS2', 30)).toMatch(/between 50/);
    expect(chargerPowerError('CHADEMO', 50)).toBeNull();
  });
  it('requires Type 2 AC to be at least 22 kW', () => {
    expect(chargerPowerError('TYPE2', 7.4)).toMatch(/between 22/);
    expect(chargerPowerError('TYPE2', 22)).toBeNull();
  });
  it('fixes Bharat DC-001 at 15 kW and Bharat AC-001 at 10 kW', () => {
    expect(chargerPowerError('BHARAT_DC001', 15)).toBeNull();
    expect(chargerPowerError('BHARAT_DC001', 20)).toMatch(/exactly 15/);
    expect(chargerPowerError('BHARAT_AC001', 10)).toBeNull();
  });
});

describe('Prices', () => {
  it('does not allow a peak price lower than the normal price', () => {
    expect(priceError({ pricePerKwh: 20, peakPricePerKwh: 15 })).toMatch(/cannot be lower/);
    expect(priceError({ pricePerKwh: 20, peakPricePerKwh: 20 })).toBeNull();
  });
  it('requires peak hours to end after they start', () => {
    expect(peakHoursError({ peakStartHour: 22, peakEndHour: 18 })).toMatch(/end after/);
    expect(peakHoursError({ peakStartHour: 18, peakEndHour: 22 })).toBeNull();
  });
});

describe('Permission map', () => {
  it('lets only station owners add stations and set prices', () => {
    expect(can('STATION_OWNER', 'stations:create')).toBe(true);
    expect(can('ADMIN', 'stations:create')).toBe(false);
    expect(can('STATION_OWNER', 'prices:manage')).toBe(true);
    expect(can('ADMIN', 'prices:manage')).toBe(false);
  });
  it('gives maintenance assignment and enquiries to the manager only', () => {
    expect(can('MANAGER', 'tickets:assign')).toBe(true);
    expect(can('ADMIN', 'tickets:assign')).toBe(false);
    expect(can('MANAGER', 'enquiries:manage')).toBe(true);
    expect(can('ADMIN', 'enquiries:manage')).toBe(false);
  });
  it('lets only admins approve accounts', () => {
    expect(can('ADMIN', 'accounts:approve')).toBe(true);
    expect(can('MANAGER', 'accounts:approve')).toBe(false);
  });
  it('lets EV owners book but not technicians', () => {
    expect(can('EV_OWNER', 'bookings:create')).toBe(true);
    expect(can('TECHNICIAN', 'bookings:create')).toBe(false);
  });
});
