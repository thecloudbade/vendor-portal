/**
 * In-memory access token store.
 * Never persisted to localStorage/sessionStorage for security.
 * Cleared on tab close / refresh (re-auth required).
 */

let accessToken: string | null = null;

export const memoryTokenStore = {
  get(): string | null {
    return accessToken;
  },

  set(token: string): void {
    accessToken = token;
  },

  clear(): void {
    accessToken = null;
  },

  hasToken(): boolean {
    return accessToken != null && accessToken.length > 0;
  },
};
