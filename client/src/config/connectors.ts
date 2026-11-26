import type { ConnectorType } from '../api/types';

export const CONNECTOR_SPECS: Record<ConnectorType, { label: string; current: 'AC' | 'DC'; minKw: number; maxKw: number; note: string }> = {
  CCS2: { label: 'CCS2', current: 'DC', minKw: 50, maxKw: 350, note: 'Fast charger, minimum 50 kW' },
  CHADEMO: { label: 'CHAdeMO', current: 'DC', minKw: 50, maxKw: 150, note: 'Fast charger, minimum 50 kW' },
  TYPE2: { label: 'Type 2 AC', current: 'AC', minKw: 22, maxKw: 43, note: 'AC charger, minimum 22 kW' },
  BHARAT_DC001: { label: 'Bharat DC-001', current: 'DC', minKw: 15, maxKw: 15, note: '15 kW, 48 V and higher-voltage variants' },
  BHARAT_AC001: { label: 'Bharat AC-001', current: 'AC', minKw: 10, maxKw: 10, note: '10 kW total, three 3.3 kW connector guns' },
};

export const CONNECTORS = Object.keys(CONNECTOR_SPECS) as ConnectorType[];

export const connectorLabel = (type: ConnectorType) => CONNECTOR_SPECS[type]?.label ?? type;
