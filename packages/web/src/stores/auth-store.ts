import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const AUTH_STORAGE_KEY = "auth-storage";

export type AuthUser = Record<string, unknown>;

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
);

export const selectIsAuthenticated = (state: AuthState) => Boolean(state.token);
