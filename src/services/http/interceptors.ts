/**
 * Auth interceptors: trigger refresh on 401, clear session on refresh failure.
 * Used by AuthProvider to wire logout/refresh; actual fetch is in client.ts.
 * We use a simple callback registry so the app can subscribe to 401/refresh failure.
 */

import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import { refreshTokenStore } from '@/services/storage/refreshTokenStore';
import { getCsrfHeaders } from '@/services/security/csrf';
import { getApiBaseUrl, type ApiError } from './client';

export type OnSessionExpired = () => void;

let onSessionExpired: OnSessionExpired | null = null;

export function setSessionExpiredHandler(handler: OnSessionExpired | null): void {
  onSessionExpired = handler;
}

export function triggerSessionExpired(): void {
  memoryTokenStore.clear();
  refreshTokenStore.clear();
  onSessionExpired?.();
}

/** Refresh response: accessToken, expiresIn; optionally refreshToken if rotated */
interface RefreshData {
  accessToken: string;
  expiresIn?: string;
  refreshToken?: string;
}

/**
 * Exchange refresh token for new access token. Sends refresh token in body
 * (or use Authorization: Bearer <refreshToken> per API). 401 = invalid/expired, re-login required.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = refreshTokenStore.get();
  if (!refreshToken) {
    /** Do not call triggerSessionExpired here — that redirects to /auth/login and causes an infinite reload loop when the user is already on the login page. */
    throw new Error('No refresh token');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getCsrfHeaders(),
  };

  const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ refreshToken }),
  });

  if (res.status === 401) {
    triggerSessionExpired();
    throw new Error('Refresh token invalid or expired');
  }
  if (!res.ok) {
    triggerSessionExpired();
    throw new Error('Refresh failed');
  }

  const raw = (await res.json()) as unknown;
  const data: RefreshData =
    raw && typeof raw === 'object' && 'data' in raw
      ? (raw as { data: RefreshData }).data
      : (raw as RefreshData);

  const accessToken = data?.accessToken;
  if (!accessToken) {
    triggerSessionExpired();
    throw new Error('No access token in refresh response');
  }

  memoryTokenStore.set(accessToken);
  if (data.refreshToken) {
    refreshTokenStore.set(data.refreshToken);
  }
  return accessToken;
}

/**
 * Wrap a request that may 401: try refresh once, then retry request.
 * Caller should use this for authenticated API calls that need retry logic.
 */
export async function withRefreshRetry<T>(
  fn: () => Promise<T>,
  onError?: (err: ApiError) => void
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const apiErr = err as ApiError;
    if (apiErr?.isUnauthorized !== true) {
      onError?.(apiErr);
      throw err;
    }
    try {
      await refreshAccessToken();
      return await fn();
    } catch {
      triggerSessionExpired();
      throw err;
    }
  }
}
