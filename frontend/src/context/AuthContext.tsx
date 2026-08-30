import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";

interface SessionUser {
  id: string;
  username: string;
  role: string;
  email?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: SessionUser | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const toSessionUser = (u: any): SessionUser | null =>
  u ? { id: u.id, username: u.username ?? "", role: u.role ?? "member", email: u.email } : null;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      try {
        const { data } = await authClient.getSession();
        if (data?.session && data.user) {
          setIsAuthenticated(true);
          setUser(toSessionUser(data.user));
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    verify();
  }, []);

  const login = async (username: string, password: string) => {
    const { error } = await authClient.signIn.username({
      username,
      password,
    });
    if (error) return { ok: false, message: error.message || "Identifiants incorrects" };
    const { data } = await authClient.getSession();
    if (data?.user) {
      setIsAuthenticated(true);
      setUser(toSessionUser(data.user));
      navigate("/");
    }
    return { ok: true };
  };

  const logout = async () => {
    await authClient.signOut();
    setIsAuthenticated(false);
    setUser(null);
    navigate("/login");
  };

  const isAdmin = user?.role === "admin" || user?.role === "super-admin";
  const isSuperAdmin = user?.role === "super-admin";

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, isAdmin, isSuperAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}