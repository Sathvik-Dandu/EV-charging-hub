import { CONNECTOR_SPECS } from '../common/business-rules';

export function priceError(p: { pricePerKwh: number; peakPricePerKwh: number }): string | null {
  return p.peakPricePerKwh < p.pricePerKwh ? 'Peak price cannot be lower than the normal price' : null;
}

export function peakHoursError(p: { peakStartHour: number; peakEndHour: number }): string | null {
  return p.peakEndHour <= p.peakStartHour ? 'Peak hours must end after they start' : null;
}

export function chargerPowerError(connectorType: keyof typeof CONNECTOR_SPECS, powerKw: number): string | null {
  const spec = CONNECTOR_SPECS[connectorType];
  if (powerKw < spec.minKw || powerKw > spec.maxKw) {
    return spec.minKw === spec.maxKw
      ? `${spec.label} chargers are rated at exactly ${spec.minKw} kW`
      : `${spec.label} chargers must be between ${spec.minKw} and ${spec.maxKw} kW`;
  }
  return null;
}
