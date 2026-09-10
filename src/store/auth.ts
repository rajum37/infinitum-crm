import { create } from "zustand";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company?: string;
  companyId?: string;
  department?: string;
  status?: string;
  isActive?: boolean;
  planName?: string;
  isOwner?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  fetchCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  setAuth: (user, token) => {
    const cleanUser = user;

    if (typeof window !== "undefined") {
      localStorage.setItem("nexus-user", JSON.stringify(cleanUser));
    }
    set({ user: cleanUser, token, isLoading: false });
  },
  fetchCurrentUser: async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) {
        await get().logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          get().setAuth(data.user, ""); // token is handled by cookie
        }
      }
    } catch (_) { } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nexus-user");
      document.cookie = "nexus-access-token=; Max-Age=0; path=/";
      document.cookie = "nexus-refresh-token=; Max-Age=0; path=/";
      document.cookie = "nexus-token=; Max-Age=0; path=/";
      document.cookie = "nexus-role=; Max-Age=0; path=/";
      document.cookie = "nexus-role-permissions=; Max-Age=0; path=/";
    }
    
    // 1. Await server-side cookie clear first BEFORE broadcasting
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (_) { }

    // 2. Now broadcast to other tabs (and this tab's listener) to redirect
    if (typeof window !== "undefined") {
      const channel = new BroadcastChannel("nexus-auth");
      channel.postMessage("LOGOUT");
      channel.close();
    }

    set({ user: null, token: null, isLoading: false });
  },
  setLoading: (loading) => set({ isLoading: loading }),
}));


