import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './client';

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

describe('token storage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips access and refresh tokens through localStorage', () => {
    expect(api.getAccessToken()).toBeNull();
    api.setTokens('access-1', 'refresh-1');
    expect(api.getAccessToken()).toBe('access-1');
    expect(api.getRefreshToken()).toBe('refresh-1');
    api.clearTokens();
    expect(api.getAccessToken()).toBeNull();
    expect(api.getRefreshToken()).toBeNull();
  });
});

describe('request()', () => {
  beforeEach(() => {
    localStorage.clear();
    api.onSessionExpired(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches the Authorization header when an access token is stored', async () => {
    api.setTokens('my-access-token', 'my-refresh-token');
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await api.listNotebooks();

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer my-access-token');
  });

  it('throws an ApiError carrying the backend status and message', async () => {
    api.setTokens('token', 'refresh');
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(409, { message: 'This email is already registered' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.register('a@test.com', 'password123')).rejects.toMatchObject({
      status: 409,
      message: 'This email is already registered',
    });
  });

  it('on a 401, silently refreshes the access token and retries the original request once', async () => {
    api.setTokens('expired-access-token', 'still-valid-refresh-token');
    const fetchMock = vi
      .fn()
      // 1. original request -> 401
      .mockResolvedValueOnce(mockResponse(401, { message: 'jwt expired' }))
      // 2. refresh endpoint -> new tokens
      .mockResolvedValueOnce(mockResponse(200, { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' }))
      // 3. retried original request -> succeeds
      .mockResolvedValueOnce(mockResponse(200, [{ id: 'nb1', name: 'Work' }]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.listNotebooks();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual([{ id: 'nb1', name: 'Work' }]);
    expect(api.getAccessToken()).toBe('new-access-token');
  });

  it('clears tokens and notifies the session-expired handler when refresh also fails', async () => {
    api.setTokens('expired-access-token', 'also-invalid-refresh-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(401, { message: 'jwt expired' }))
      .mockResolvedValueOnce(mockResponse(401, { message: 'refresh token invalid' }));
    vi.stubGlobal('fetch', fetchMock);

    const onExpired = vi.fn();
    api.onSessionExpired(onExpired);

    await expect(api.listNotebooks()).rejects.toMatchObject({ status: 401 });
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(api.getAccessToken()).toBeNull();
  });

  it('does not attempt a refresh loop when there is no refresh token at all', async () => {
    // no tokens set
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(401, { message: 'unauthorized' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.listNotebooks()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
