import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, setAuthToken } from './api';

// Echo the resolved Authorization header back as the response body.
api.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => ({
  data: config.headers.get('Authorization') ?? null,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

describe('api client', () => {
  beforeEach(() => setAuthToken(null));

  it('attaches the bearer token to outgoing requests', async () => {
    setAuthToken('jwt-123');
    const response = await api.get('/videos');
    expect(response.data).toBe('Bearer jwt-123');
  });

  it('sends no Authorization header when unauthenticated', async () => {
    const response = await api.get('/videos');
    expect(response.data).toBeNull();
  });
});
