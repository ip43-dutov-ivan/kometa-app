"use client";

import { createKometaApiClient } from "@kometa/logic";
import { kometaSessionStore } from "@kometa/logic";

export const KOMETA_SESSION_STORAGE_KEY = "kometa.session.v1";
const KOMETA_API_BASE_URL = process.env.NEXT_PUBLIC_KOMETA_API_BASE_URL ?? "/api/v1";
let refreshAccessTokenPromise: Promise<string | null> | null = null;

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return kometaSessionStore.getState().accessToken ?? readStoredSession()?.accessToken ?? null;
}

export const kometaUnauthenticatedApi = createKometaApiClient({
  baseUrl: KOMETA_API_BASE_URL,
});

export const kometaApi = createKometaApiClient({
  baseUrl: KOMETA_API_BASE_URL,
  getAccessToken: getStoredAccessToken,
  refreshAccessToken,
});

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: ReturnType<typeof kometaSessionStore.getState>["user"];
}

export function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(KOMETA_SESSION_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession) as StoredSession;
    return parsed.accessToken && parsed.refreshToken && parsed.user ? parsed : null;
  } catch (_error) {
    window.localStorage.removeItem(KOMETA_SESSION_STORAGE_KEY);
    return null;
  }
}

export function writeStoredSession(session: StoredSession): void {
  window.localStorage.setItem(KOMETA_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(KOMETA_SESSION_STORAGE_KEY);
}

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return kometaSessionStore.getState().refreshToken ?? readStoredSession()?.refreshToken ?? null;
}

function refreshAccessToken(): Promise<string | null> {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = refreshAccessTokenOnce().finally(() => {
      refreshAccessTokenPromise = null;
    });
  }

  return refreshAccessTokenPromise;
}

async function refreshAccessTokenOnce(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  const currentUser = kometaSessionStore.getState().user ?? readStoredSession()?.user ?? null;

  if (!refreshToken || !currentUser) {
    clearSessionState();
    return null;
  }

  try {
    const refreshedSession = await kometaUnauthenticatedApi.auth.refresh({ refreshToken });
    const nextSession = {
      accessToken: refreshedSession.accessToken,
      refreshToken,
      user: currentUser,
    };

    kometaSessionStore.getState().setSession(nextSession);
    writeStoredSession(nextSession);

    return refreshedSession.accessToken;
  } catch (_error) {
    clearSessionState();
    return null;
  }
}

function clearSessionState(): void {
  kometaSessionStore.getState().clearSession();

  if (typeof window !== "undefined") {
    clearStoredSession();
  }
}
