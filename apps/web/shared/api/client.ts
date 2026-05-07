"use client";

import { createKometaApiClient } from "@kometa/logic";
import { kometaSessionStore } from "@kometa/logic";

export const KOMETA_SESSION_STORAGE_KEY = "kometa.session.v1";
const KOMETA_API_BASE_URL = process.env.NEXT_PUBLIC_KOMETA_API_BASE_URL ?? "/api/v1";

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return kometaSessionStore.getState().accessToken ?? readStoredSession()?.accessToken ?? null;
}

export const kometaApi = createKometaApiClient({
  baseUrl: KOMETA_API_BASE_URL,
  getAccessToken: getStoredAccessToken,
});

export const kometaUnauthenticatedApi = createKometaApiClient({
  baseUrl: KOMETA_API_BASE_URL,
});

export interface StoredSession {
  accessToken: string;
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
    return parsed.accessToken && parsed.user ? parsed : null;
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
