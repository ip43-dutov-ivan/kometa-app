import { createStore } from "zustand/vanilla";
import type { AuthSession, User } from "../api/dtos";

export interface KometaSessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  hasHydrated: boolean;
}

export interface KometaSessionActions {
  setSession: (session: AuthSession) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  markHydrated: () => void;
}

export type KometaSessionStore = KometaSessionState & KometaSessionActions;

const initialState: KometaSessionState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  hasHydrated: false,
};

export const kometaSessionStore = createStore<KometaSessionStore>()((set) => ({
  ...initialState,
  setSession: (session) =>
    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
  markHydrated: () => set({ hasHydrated: true }),
}));

export const selectAccessToken = (state: KometaSessionStore) => state.accessToken;
export const selectRefreshToken = (state: KometaSessionStore) => state.refreshToken;
export const selectCurrentUser = (state: KometaSessionStore) => state.user;
export const selectIsAuthenticated = (state: KometaSessionStore) => Boolean(state.accessToken);
export const selectHasHydrated = (state: KometaSessionStore) => state.hasHydrated;
