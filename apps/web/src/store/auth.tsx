import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { UserDTO } from '@hafalati/shared';
import { tokenStore } from '@/lib/api';
import { endpoints } from '@/lib/queries';

interface AuthState {
  user: UserDTO | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (body: Record<string, unknown>) => Promise<UserDTO>;
  registerVendor: (body: Record<string, unknown>) => Promise<UserDTO>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!tokenStore.access) {
      setLoading(false);
      return;
    }
    endpoints
      .me()
      .then((u) => active && setUser(u))
      .catch(() => tokenStore.clear())
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await endpoints.login(email, password);
    tokenStore.set(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  };

  const register = async (body: Record<string, unknown>) => {
    const res = await endpoints.register(body);
    tokenStore.set(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  };

  const registerVendor = async (body: Record<string, unknown>) => {
    const res = await endpoints.registerVendor(body);
    tokenStore.set(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, register, registerVendor, logout }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
