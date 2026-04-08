/**
 * Persists refresh token in sessionStorage so it survives page refresh
 * but is cleared when the tab is closed. Used for POST /auth/refresh.
 * All methods guard against missing or throwing sessionStorage (e.g. private mode).
 */

const KEY = 'vp_refresh_token';

function safeGetStorage(): Storage | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}

export const refreshTokenStore = {
  get(): string | null {
    try {
      const storage = safeGetStorage();
      return storage ? storage.getItem(KEY) : null;
    } catch {
      return null;
    }
  },

  set(token: string): void {
    try {
      safeGetStorage()?.setItem(KEY, token);
    } catch {
      // ignore (e.g. private browsing, quota)
    }
  },

  clear(): void {
    try {
      safeGetStorage()?.removeItem(KEY);
    } catch {
      // ignore
    }
  },

  hasToken(): boolean {
    const t = this.get();
    return t != null && t.length > 0;
  },
};
