import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api, logout } from "../lib/api";

interface SessionUser {
  id: string;
  username: string;
  email?: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: SessionUser | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await api<{ user: SessionUser | null }>("/api/session");
        if (s.user) {
          setIsAuthenticated(true);
          setUser(s.user);
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      return { ok: false, message: data.message || data.error || "Identifiants incorrects" };
    }
    try {
      const s = await api<{ user: SessionUser | null }>("/api/session");
      if (s.user) {
        setIsAuthenticated(true);
        setUser(s.user);
      }
    } catch {}
    return { ok: true };
  };

  const doLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const isAdmin = user?.role === "admin" || user?.role === "super-admin";
  const isSuperAdmin = user?.role === "super-admin";

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, isAdmin, isSuperAdmin, login, logout: doLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}