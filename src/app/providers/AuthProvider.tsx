import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import {
  setSessionExpiredHandler,
  refreshAccessToken,
  triggerSessionExpired,
} from '@/services/http/interceptors';
import type { AuthUser } from '@/modules/common/types/api';
import { http } from '@/services/http/client';
import { ApiError } from '@/services/http/client';

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
      window.location.href = '/auth/login';
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    if (!memoryTokenStore.hasToken()) {
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await http.get<{ user: AuthUser }>(ME_PATH);
        if (!cancelled && data?.user) {
          setUserState(data.user);
        } else if (!cancelled) {
          memoryTokenStore.clear();
        }
      } catch (err) {
        if (cancelled) return;
        const apiErr = err as ApiError;
        if (apiErr?.isUnauthorized) {
          try {
            await refreshAccessToken();
            const retry = await http.get<{ user: AuthUser }>(ME_PATH);
            if (!cancelled && retry?.user) setUserState(retry.user);
            else if (!cancelled) memoryTokenStore.clear();
          } catch {
            if (!cancelled) {
              memoryTokenStore.clear();
              setUserState(null);
            }
          }
        } else {
          memoryTokenStore.clear();
          setUserState(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    })();
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
