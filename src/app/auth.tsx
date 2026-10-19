import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/shared/api/commands";
import { SESSION_EXPIRED_EVENT } from "@/shared/api/client";
import type { Permission, SessionUser } from "@/shared/api/types";

interface AuthValue {
  user: SessionUser | null;
  /** Session token, held in memory only (never persisted). */
  token: string | null;
  expired: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (p: Permission) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ token: string; user: SessionUser } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const onExpired = () => {
      setSession(null);
      setExpired(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    setExpired(false);
    setSession(res);
  }, []);

  const logout = useCallback(async () => {
    const token = session?.token;
    setSession(null);
    if (token) await api.logout(token).catch(() => undefined);
  }, [session]);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      expired,
      login,
      logout,
      can: (p) => session?.user.permissions.includes(p) ?? false,
    }),
    [session, expired, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** For pages rendered only after login. */
export function useSession(): { user: SessionUser; token: string; can: (p: Permission) => boolean } {
  const { user, token, can } = useAuth();
  if (!user || !token) throw new Error("useSession used without an active session");
  return { user, token, can };
}
