import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from '../api/client';
import type { User } from '../types';

const USER_KEY = 'nb_user';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  authError: string | null;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Rehydrated synchronously from localStorage so a page refresh doesn't
  // flash the login screen before we know a session might already exist.
  // If the stored tokens turn out to be stale, the api client's automatic
  // refresh-then-logout flow (see onSessionExpired below) corrects this as
  // soon as the app makes its first real request.
  const [user, setUser] = useState<User | null>(() =>
    api.getAccessToken() ? loadStoredUser() : null
  );
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    api.onSessionExpired(() => {
      setUser(null);
      localStorage.removeItem(USER_KEY);
    });
    return () => api.onSessionExpired(null);
  }, []);

  const handleAuthResult = useCallback((result: api.AuthResult) => {
    api.setTokens(result.accessToken, result.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      try {
        handleAuthResult(await api.register(email, password));
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Something went wrong');
        throw err;
      }
    },
    [handleAuthResult]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      try {
        handleAuthResult(await api.login(email, password));
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Something went wrong');
        throw err;
      }
    },
    [handleAuthResult]
  );

  const logout = useCallback(async () => {
    await api.logout();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, authError, register, login, logout, clearAuthError }),
    [user, authError, register, login, logout, clearAuthError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
