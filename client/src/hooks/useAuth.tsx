import React, { useState, useEffect, createContext, useContext } from "react";
import { apiRequest } from "../lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
  sessionExpiry: Date;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (telegramAuthData: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check authentication status on initial load
  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false));
  }, []);

  // Check session expiry periodically
  useEffect(() => {
    if (!user) return;

    // Check if the session is about to expire (within 1 hour)
    const sessionExpiry = new Date(user.sessionExpiry);
    const now = new Date();
    const oneHourInMs = 60 * 60 * 1000;
    
    if (sessionExpiry.getTime() - now.getTime() <= oneHourInMs) {
      // Session is about to expire, refresh it
      checkAuth();
    }
    
    // Check every hour
    const interval = setInterval(() => {
      checkAuth();
    }, oneHourInMs);
    
    return () => clearInterval(interval);
  }, [user]);

  const checkAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/status", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to check authentication status");
      }
      
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUser({
          ...data.user,
          sessionExpiry: new Date(data.user.sessionExpiry),
        });
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
      return false;
    }
  };

  const login = async (telegramAuthData: any): Promise<void> => {
    try {
      const response = await apiRequest("POST", "/api/auth/telegram", telegramAuthData);
      const userData = await response.json();
      
      setUser({
        ...userData,
        sessionExpiry: new Date(userData.sessionExpiry),
      });
      
      // Invalidate queries that might depend on auth status
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      
      // Invalidate queries that might depend on auth status
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const contextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
