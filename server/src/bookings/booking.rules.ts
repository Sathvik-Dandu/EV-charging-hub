import { BUSINESS_RULES } from '../common/business-rules';

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function minutesOfDay(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function validateSlot(
  start: Date,
  durationMinutes: number,
  station: { opensAt: string; closesAt: string },
  now = new Date(),
): string | null {
  if (Number.isNaN(start.getTime())) return 'Invalid slot start time';
  if (!BUSINESS_RULES.ALLOWED_SLOT_DURATIONS.includes(durationMinutes)) {
    return `Slot duration must be one of ${BUSINESS_RULES.ALLOWED_SLOT_DURATIONS.join(', ')} minutes`;
  }
  if (start.getTime() < now.getTime() - 60_000) return 'Slot start time cannot be in the past';

  const maxDate = now.getTime() + BUSINESS_RULES.MAX_ADVANCE_BOOKING_DAYS * 24 * 60 * 60 * 1000;
  if (start.getTime() > maxDate) {
    return `Bookings can be made only ${BUSINESS_RULES.MAX_ADVANCE_BOOKING_DAYS} days in advance`;
  }

  if (station.opensAt === '00:00' && station.closesAt === '23:59') return null;
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = startMin + durationMinutes;
  if (startMin < minutesOfDay(station.opensAt) || endMin > minutesOfDay(station.closesAt) + 1) {
    return `Station operates between ${station.opensAt} and ${station.closesAt}`;
  }
  return null;
}
