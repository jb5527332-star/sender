"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { IUser } from "@/interfaces/server-types";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: IUser | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [user, setUser] = useState<IUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return false;
      }

      // Verify token with the server
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        }
      ).finally(() => clearTimeout(timeout));

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.data);
        setIsAdmin(data.data.role === "admin");
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      } else {
        // Token is invalid, remove it
        localStorage.removeItem("authToken");
        setIsAuthenticated(false);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      localStorage.removeItem("authToken");
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
          signal: controller.signal,
        }
      ).finally(() => clearTimeout(timeout));

      const data = await response.json();

      if (response.ok && data.success && data.data?.accessToken) {
        localStorage.setItem("authToken", data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem("refreshToken", data.data.refreshToken);
        }
        if (data.data.user) {
          setUser(data.data.user);
          setIsAdmin(data.data.user.role === "admin");
        }
        setIsAuthenticated(true);
        return true;
      } else {
        const message =
          data?.error ||
          data?.message ||
          "Invalid email or password";
        throw new Error(message);
      }
    } catch (err) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      setIsAuthenticated(false);
      let message = "Login failed. Please try again.";
      const errorLike =
        typeof err === "object" && err !== null
          ? (err as { name?: string; message?: string })
          : {};
      const name = errorLike.name || "";
      const msg = errorLike.message || "";
      if (name === "AbortError") {
        message = "Network timeout. Your connection seems unstable.";
      } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        message = "Network error. Please check your internet connection.";
      } else if (msg) {
        message = msg;
      }
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    setIsAuthenticated(false);
    setUser(null);
    setIsAdmin(false);
    router.push("/login");
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) return false;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
          signal: controller.signal,
        }
      ).finally(() => clearTimeout(timeout));

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("authToken", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        return true;
      }

      logout();
      return false;
    } catch (error) {
      console.error("Token refresh error:", error);
      logout();
      return false;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    isAdmin,
    login,
    logout,
    checkAuth,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push("/login");
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will redirect to login
    }

    return <Component {...props} />;
  };
}
