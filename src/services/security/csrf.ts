/**
 * CSRF token handling for cookie-based auth.
 * Backend sets X-CSRF-Token header expectation; we send token from cookie or meta.
 */

const CSRF_HEADER = 'X-CSRF-Token';

/**
 * Get CSRF token from cookie (set by backend) or from meta tag.
 * Cookie name should match backend (e.g. csrf-token).
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  if (match) return decodeURIComponent(match[1].trim());
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') ?? null;
}

/**
 * Headers to attach to state-changing requests when using cookies.
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (!token) return {};
  return { [CSRF_HEADER]: token };
}

export { CSRF_HEADER };
