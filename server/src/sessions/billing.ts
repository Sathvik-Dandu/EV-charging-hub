import { BUSINESS_RULES } from '../common/business-rules';

const round = (value: number) => Math.round(value * 100) / 100;

export function calculateBill(energyKwh: number, pricePerKwh: number) {
  const energyCost = round(energyKwh * pricePerKwh);
  const taxAmount = round((energyCost * BUSINESS_RULES.GST_PERCENT) / 100);
  return { pricePerKwh, energyCost, taxAmount, totalAmount: round(energyCost + taxAmount) };
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
