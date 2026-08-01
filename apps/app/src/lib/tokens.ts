import { AUTH_BASE_URL } from './env';

/** Exchanges the better-auth cookie session for a bearer JWT used by the API. */
export async function fetchApiToken(): Promise<string | null> {
  const response = await fetch(`${AUTH_BASE_URL}/token`, {
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { token?: string };
  return data.token ?? null;
}
