import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from './env';

let authToken: string | null = null;
let tokenRefresher: (() => Promise<string | null>) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/**
 * The API JWT is short-lived. When a request comes back 401 we let the auth
 * layer mint a fresh token once and replay the original request.
 */
export function registerTokenRefresher(fn: (() => Promise<string | null>) | null) {
  tokenRefresher = fn;
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.set('Authorization', `Bearer ${authToken}`);
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const shouldRetry =
      error.response?.status === 401 && original && !original._retried && tokenRefresher;

    if (shouldRetry && original && tokenRefresher) {
      original._retried = true;
      const token = await tokenRefresher();
      if (token) {
        original.headers.set('Authorization', `Bearer ${token}`);
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);
