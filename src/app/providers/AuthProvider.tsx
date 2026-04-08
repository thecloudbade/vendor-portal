import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import { refreshTokenStore } from '@/services/storage/refreshTokenStore';
import {
  setSessionExpiredHandler,
  refreshAccessToken,
  triggerSessionExpired,
} from '@/services/http/interceptors';
import type { AuthUser } from '@/modules/common/types/api';
import { parseAuthMeResponse } from '@/modules/auth/utils/mapApiUser';
import { http } from '@/services/http/client';
import { ApiError } from '@/services/http/client';
import { ROUTES } from '@/modules/common/constants/routes';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const ME_PATH = '/auth/me';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
  }, []);

  const logout = useCallback(async () => {
    setUserState(null);
    memoryTokenStore.clear();
    refreshTokenStore.clear();
    try {
      await http.post('/auth/logout');
    } catch {
      // ignore
    }
    triggerSessionExpired();
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUserState(null);
      memoryTokenStore.clear();
      refreshTokenStore.clear();
      const path = window.location.pathname;
      const onOrgVendorAuth =
        path.includes('/auth/login') ||
        path.includes('/auth/verify-otp');
      const onPlatformAuth =
        path.includes('/auth/platform/login') ||
        path.includes('/auth/platform/verify-otp');
      const onAuthRoute = onOrgVendorAuth || onPlatformAuth || path.startsWith('/org-admin/');
      if (!onAuthRoute) {
        const login =
          path.startsWith('/platform') || path.startsWith('/auth/platform')
            ? ROUTES.PLATFORM.LOGIN
            : ROUTES.LOGIN;
        window.location.href = login;
      }
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        if (memoryTokenStore.hasToken()) {
          const data = await http.get<unknown>(ME_PATH);
          const user = parseAuthMeResponse(data);
          if (!cancelled && user) {
            setUserState(user);
            return;
          }
          if (!cancelled) memoryTokenStore.clear();
        }

        try {
          await refreshAccessToken();
          if (cancelled) return;
          const data = await http.get<unknown>(ME_PATH);
          const user = parseAuthMeResponse(data);
          if (!cancelled && user) setUserState(user);
          else if (!cancelled) memoryTokenStore.clear();
        } catch {
          if (!cancelled) {
            memoryTokenStore.clear();
            setUserState(null);
          }
        }
      } catch (err) {
        if (cancelled) return;
        const apiErr = err as ApiError;
        if (apiErr?.isUnauthorized) {
          try {
            await refreshAccessToken();
            if (cancelled) return;
            const retry = await http.get<unknown>(ME_PATH);
            const user = parseAuthMeResponse(retry);
            if (!cancelled && user) setUserState(user);
            else if (!cancelled) memoryTokenStore.clear();
          } catch {
            if (!cancelled) {
              memoryTokenStore.clear();
              setUserState(null);
            }
          }
        } else {
          if (!cancelled) {
            memoryTokenStore.clear();
            setUserState(null);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isInitialized,
      setUser,
      logout,
    }),
    [user, isLoading, isInitialized, setUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
