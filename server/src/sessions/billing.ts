import { BUSINESS_RULES } from '../common/business-rules';

export interface Prices {
  pricePerKwh: number;
  peakPricePerKwh: number;
  peakStartHour: number;
  peakEndHour: number;
  idleFeePerMin: number;
}

export interface BillInput {
  startedAt: Date;
  durationMin: number;
  energyKwh: number;
  idleMinutes: number;
  prices: Prices;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function isPeakHour(hour: number, prices: Prices): boolean {
  return hour >= prices.peakStartHour && hour < prices.peakEndHour;
}

export function calculateBill({ startedAt, durationMin, energyKwh, idleMinutes, prices }: BillInput) {
  const minutes = Math.max(1, durationMin);
  let peakMinutes = 0;
  for (let i = 0; i < minutes; i++) {
    const hour = new Date(startedAt.getTime() + i * 60_000).getHours();
    if (isPeakHour(hour, prices)) peakMinutes++;
  }

  const peakKwh = round((energyKwh * peakMinutes) / minutes);
  const offPeakKwh = round(energyKwh - peakKwh);
  const energyCost = round(offPeakKwh * prices.pricePerKwh);
  const peakCost = round(peakKwh * prices.peakPricePerKwh);
  const chargeableIdle = Math.max(0, idleMinutes - BUSINESS_RULES.IDLE_GRACE_MINUTES);
  const idleFee = round(chargeableIdle * prices.idleFeePerMin);
  const subtotal = energyCost + peakCost + idleFee;
  const taxAmount = round((subtotal * BUSINESS_RULES.GST_PERCENT) / 100);

  return {
    offPeakKwh,
    peakKwh,
    energyCost,
    peakCost,
    idleFee,
    taxAmount,
    totalAmount: round(subtotal + taxAmount),
  };
}

export function simulateEnergy(startedAt: Date, powerKw: number, batteryKwh: number, now = new Date()) {
  const speed = Number(process.env.SIMULATION_SPEED ?? 1);
  const elapsedMin = Math.floor(((now.getTime() - startedAt.getTime()) / 60_000) * speed);
  const capacity = batteryKwh * 0.8;
  const minutesToFull = Math.ceil((capacity * 60) / (powerKw * BUSINESS_RULES.CHARGING_EFFICIENCY));
  const durationMin = Math.min(elapsedMin, minutesToFull);
  const energyKwh = round(Math.min((powerKw * durationMin * BUSINESS_RULES.CHARGING_EFFICIENCY) / 60, capacity));
  return { durationMin, energyKwh, batteryFull: elapsedMin >= minutesToFull };
}
