import type { ConnectorType, Station, StationPrice } from '../api/types';

export const priceFor = (station: Pick<Station, 'prices'>, type: ConnectorType): StationPrice | undefined =>
  station.prices?.find((p) => p.connectorType === type);

export const lowestPrice = (station: Pick<Station, 'prices'>): number | undefined =>
  station.prices?.length ? Math.min(...station.prices.map((p) => p.pricePerKwh)) : undefined;

export const peakHoursText = (station: Pick<Station, 'peakStartHour' | 'peakEndHour'>) =>
  `${String(station.peakStartHour).padStart(2, '0')}:00–${String(station.peakEndHour).padStart(2, '0')}:00`;
