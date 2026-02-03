/**
 * Central HTTP client with credentials for refresh cookie,
 * CSRF headers, and Bearer token from memory store.
 */

import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import { getCsrfHeaders } from '@/services/security/csrf';

const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL ?? '';

export type RequestConfig = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
  skipCsrf?: boolean;
};

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const base = getBaseUrl().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  let url = `${base}${normalizedPath}`;
  if (params && Object.keys(params).length > 0) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') search.set(k, String(v));
    }
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

function getAuthHeaders(): Record<string, string> {
  const token = memoryTokenStore.get();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function request<T>(
  path: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, skipAuth, skipCsrf, ...init } = config;
  const url = buildUrl(path, params);
  const headers = new Headers(init.headers as HeadersInit);

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    Object.entries(getAuthHeaders()).forEach(([k, v]) => headers.set(k, v));
  }
  if (!skipCsrf) {
    Object.entries(getCsrfHeaders()).forEach(([k, v]) => headers.set(k, v));
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const err = new ApiError(response.status, response.statusText, await response.text());
    throw err;
  }

  const contentType = response.headers.get('Content-Type');
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return response as unknown as T;
}

export const http = {
  get: <T>(path: string, config?: RequestConfig) =>
    request<T>(path, { ...config, method: 'GET' }),
  post: <T>(path: string, body?: unknown, config?: RequestConfig) =>
    request<T>(path, { ...config, method: 'POST', body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown, config?: RequestConfig) =>
    request<T>(path, { ...config, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, config?: RequestConfig) =>
    request<T>(path, { ...config, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, config?: RequestConfig) =>
    request<T>(path, { ...config, method: 'DELETE' }),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    statusText: string,
    public body?: string
  ) {
    super(`${status} ${statusText}`);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isRateLimited(): boolean {
    return this.status === 429;
  }
  get isServerError(): boolean {
    return this.status >= 500;
  }
}
