import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../app/store';
import { pushLiveEvent, setSocketConnected } from '../features/uiSlice';

const EVENT_QUERIES: Record<string, string[][]> = {
  'charger:status': [['stations'], ['chargers'], ['overview']],
  'booking:updated': [['bookings'], ['overview']],
  'session:updated': [['sessions'], ['invoices'], ['overview'], ['bookings']],
  'ticket:updated': [['tickets'], ['overview']],
};

export function useRealtime() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector((s) => Boolean(s.auth.accessToken));

  useEffect(() => {
    if (!loggedIn) return;
    const socket = io({ path: '/socket.io', transports: ['websocket'] });
    socket.on('connect', () => dispatch(setSocketConnected(true)));
    socket.on('disconnect', () => dispatch(setSocketConnected(false)));

    Object.entries(EVENT_QUERIES).forEach(([event, keys]) => {
      socket.on(event, (payload: { code?: string; status?: string; reason?: string; id?: number }) => {
        keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
        const message =
          event === 'charger:status'
            ? `${payload.code} → ${payload.status}: ${payload.reason}`
            : `${event.split(':')[0]} #${payload.id} ${payload.status?.toLowerCase().replace('_', ' ')}`;
        dispatch(
          pushLiveEvent({ id: `${Date.now()}-${Math.random()}`, type: event, message, status: payload.status, at: new Date().toISOString() }),
        );
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [loggedIn, queryClient, dispatch]);
}
