import axios, { AxiosError } from 'axios';
import { store } from '../app/store';
import { loggedIn, loggedOut } from '../features/authSlice';
import type { AuthResponse } from './types';

export const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = store.getState().auth.refreshToken;
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<AuthResponse>('/api/auth/refresh', { refreshToken });
    store.dispatch(loggedIn(data));
    return data.accessToken;
  } catch {
    store.dispatch(loggedOut());
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry && !original.url?.startsWith('/auth/')) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { message?: string | string[] })?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
    if (!error.response) return 'Cannot reach the server. Is the API running?';
  }
  return 'Something went wrong';
}
