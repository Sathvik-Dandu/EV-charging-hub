import dayjs from 'dayjs';

export const APP_NAME = 'Green Mobility Charge Hub';
export const CURRENCY_SYMBOL = '₹';

export const money = (value: number) =>
  `${CURRENCY_SYMBOL}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const compactMoney = (value: number) =>
  `${CURRENCY_SYMBOL}${Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;

export const kwh = (value: number) => `${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kWh`;

export const dateTime = (value: string | Date) => dayjs(value).format('DD MMM YYYY, hh:mm A');

export const timeOnly = (value: string | Date) => dayjs(value).format('hh:mm A');

export const shortDate = (value: string | Date) => dayjs(value).format('DD MMM');

export const label = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

export const minutesToText = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};
