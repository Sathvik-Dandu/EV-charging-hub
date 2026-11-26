import { CONNECTOR_SPECS } from '../common/business-rules';

export function chargerPowerError(connectorType: keyof typeof CONNECTOR_SPECS, powerKw: number): string | null {
  const spec = CONNECTOR_SPECS[connectorType];
  if (powerKw < spec.minKw || powerKw > spec.maxKw) {
    return spec.minKw === spec.maxKw
      ? `${spec.label} chargers are rated at exactly ${spec.minKw} kW`
      : `${spec.label} chargers must be between ${spec.minKw} and ${spec.maxKw} kW`;
  }
  return null;
}
