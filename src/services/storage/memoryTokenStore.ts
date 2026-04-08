/**
 * In-memory access token store.
 * Not persisted to localStorage/sessionStorage; on page refresh we restore
 * session by calling the refresh endpoint (httpOnly cookie) and then GET /auth/me.
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
