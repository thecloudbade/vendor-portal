/**
 * Auth interceptors: trigger refresh on 401, clear session on refresh failure.
 * Used by AuthProvider to wire logout/refresh; actual fetch is in client.ts.
 * We use a simple callback registry so the app can subscribe to 401/refresh failure.
 */

import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import { getCsrfHeaders } from '@/services/security/csrf';
import type { ApiError } from './client';

export type OnSessionExpired = () => void;

let onSessionExpired: OnSessionExpired | null = null;

export function setSessionExpiredHandler(handler: OnSessionExpired | null): void {
  onSessionExpired = handler;
}

export function triggerSessionExpired(): void {
  memoryTokenStore.clear();
  onSessionExpired?.();
}

/**
 * Attempt silent refresh; returns new access token or throws.
 */
export async function refreshAccessToken(): Promise<string> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: getCsrfHeaders(),
  });
  if (!res.ok) {
    triggerSessionExpired();
    throw new Error('Refresh failed');
  }
  const data = (await res.json()) as { accessToken: string };
  if (!data.accessToken) {
    triggerSessionExpired();
    throw new Error('No access token in refresh response');
  }
  memoryTokenStore.set(data.accessToken);
  return data.accessToken;
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
