"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";

export function Global401Interceptor() {
  const { logout } = useAuthStore();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      try {
        const response = await originalFetch.apply(this, args);
        
        if (response.status === 401) {
          // If any fetch returns 401, trigger global logout and redirect
          await logout();
          window.location.replace("/login");
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [logout]);

  return null;
}
