const trimTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export const API_URL = trimTrailingSlash(import.meta.env.VITE_API_URL ?? 'http://localhost:3000');

export const AUTH_URL = trimTrailingSlash(import.meta.env.VITE_AUTH_URL ?? 'http://localhost:3001');

export const AUTH_BASE_URL = `${AUTH_URL}/api/auth`;
