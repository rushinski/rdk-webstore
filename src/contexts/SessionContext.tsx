"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { ProfileRole } from "@/config/constants/roles";

interface SessionUser {
  id: string;
  email: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  role: ProfileRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  initialUser,
  initialRole,
}: {
  children: React.ReactNode;
  initialUser: SessionUser | null;
  initialRole: ProfileRole | null;
}) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [role, setRole] = useState<ProfileRole | null>(initialRole);
  const [isLoading, setIsLoading] = useState(false);

  const refreshSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        setRole(null);
        return;
      }
      const data = await response.json();
      setUser(data.user ?? null);
      setRole(data.role ?? null);
    } catch {
      // Keep existing session on error
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for session update events (triggered by login/logout)
  useEffect(() => {
    const handleSessionUpdate = () => {
      void refreshSession();
    };

    window.addEventListener("sessionUpdate", handleSessionUpdate);
    return () => window.removeEventListener("sessionUpdate", handleSessionUpdate);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        user,
        role,
        isAuthenticated: Boolean(user),
        isLoading,
        refreshSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
