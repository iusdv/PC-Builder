import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, setAccessToken, type AuthUser } from '../api/client';

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await authApi.refresh();
    setAccessToken(res.data.accessToken);
    const me = await authApi.me();
    setUser(me.data);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await refresh();
      } catch {
        setAccessToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setAccessToken(res.data.accessToken);
    const me = await authApi.me();
    setUser(me.data);
  }, []);

  const register = useCallback(async (email: string, password: string, userName?: string) => {
    const res = await authApi.register({ email, password, userName });
    setAccessToken(res.data.accessToken);
    const me = await authApi.me();
    setUser(me.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
      window.location.reload();
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refresh,
    }),
    [user, isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
