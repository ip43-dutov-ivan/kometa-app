"use client";

import { useCallback, useEffect } from "react";
import type { AuthSession } from "@kometa/logic";
import {
  kometaSessionStore,
  selectAccessToken,
  selectCurrentUser,
  selectHasHydrated,
  selectIsAuthenticated,
} from "@kometa/logic";
import { useStore } from "zustand";
import { clearStoredSession, readStoredSession, writeStoredSession } from "../api/client";

export function useKometaSession() {
  const accessToken = useStore(kometaSessionStore, selectAccessToken);
  const user = useStore(kometaSessionStore, selectCurrentUser);
  const isAuthenticated = useStore(kometaSessionStore, selectIsAuthenticated);
  const hasHydrated = useStore(kometaSessionStore, selectHasHydrated);

  useEffect(() => {
    if (kometaSessionStore.getState().hasHydrated) {
      return;
    }

    const storedSession = readStoredSession();
    if (storedSession?.accessToken && storedSession.user) {
      kometaSessionStore.getState().setSession({
        accessToken: storedSession.accessToken,
        user: storedSession.user,
      });
    }

    kometaSessionStore.getState().markHydrated();
  }, []);

  const setSession = useCallback((session: AuthSession) => {
    kometaSessionStore.getState().setSession(session);
    writeStoredSession({ accessToken: session.accessToken, user: session.user });
  }, []);

  const clearSession = useCallback(() => {
    kometaSessionStore.getState().clearSession();
    clearStoredSession();
  }, []);

  const setUser = useCallback((nextUser: NonNullable<typeof user>) => {
    kometaSessionStore.getState().setUser(nextUser);
    const accessToken = kometaSessionStore.getState().accessToken;
    if (accessToken) {
      writeStoredSession({ accessToken, user: nextUser });
    }
  }, []);

  return {
    accessToken,
    user,
    isAuthenticated,
    hasHydrated,
    setSession,
    clearSession,
    setUser,
  };
}
