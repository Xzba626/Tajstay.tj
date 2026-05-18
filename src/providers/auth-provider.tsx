"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [baseUrl, setBaseUrl] = useState<string | undefined>(undefined);

  // Ensure Auth.js client calls use the current host (works behind tunnels/domains).
  useEffect(() => {
    try {
      setBaseUrl(window.location.origin);
    } catch {
      setBaseUrl(undefined);
    }
  }, []);

  return (
    <SessionProvider baseUrl={baseUrl} basePath="/api/auth">
      {children}
    </SessionProvider>
  );
}
