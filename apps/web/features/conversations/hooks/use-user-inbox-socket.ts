"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ChatServerEvent } from "@kometa/logic";
import { chatRealtimeStore, kometaSessionStore } from "@kometa/logic";

interface Options {
  enabled: boolean;
  onEvent: (event: ChatServerEvent) => void;
}

export function useUserInboxSocket({ enabled, onEvent }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const unmountedRef = useRef(false);
  const connectionVersionRef = useRef(0);

  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled || unmountedRef.current) return;

    const token = kometaSessionStore.getState().accessToken;
    if (!token) {
      chatRealtimeStore.getState().setInboxConnectionStatus("disconnected");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_KOMETA_API_BASE_URL ?? "";
    let wsHost: string;
    let proto: string;
    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      const parsed = new URL(apiBase);
      wsHost = parsed.host;
      proto = parsed.protocol === "https:" ? "wss:" : "ws:";
    } else {
      wsHost = window.location.host;
      proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    }

    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }

    const connectionVersion = connectionVersionRef.current + 1;
    connectionVersionRef.current = connectionVersion;
    const ws = new WebSocket(`${proto}//${wsHost}/ws/me/?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    chatRealtimeStore.getState().setInboxConnectionStatus("connecting");

    ws.onopen = () => {
      if (unmountedRef.current || connectionVersionRef.current !== connectionVersion) {
        ws.close();
        return;
      }
      chatRealtimeStore.getState().setInboxConnectionStatus("connected");
      attemptsRef.current = 0;
    };

    ws.onmessage = (ev) => {
      if (connectionVersionRef.current !== connectionVersion) return;

      try {
        const data = JSON.parse(ev.data) as ChatServerEvent;
        onEventRef.current(data);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      if (connectionVersionRef.current !== connectionVersion) return;
      chatRealtimeStore.getState().setInboxConnectionStatus("error");
    };

    ws.onclose = () => {
      if (unmountedRef.current || connectionVersionRef.current !== connectionVersion) return;
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      chatRealtimeStore.getState().setInboxConnectionStatus("disconnected");
      const delay = Math.min(1000 * 2 ** attemptsRef.current, 16_000);
      attemptsRef.current += 1;
      reconnectRef.current = setTimeout(connect, delay);
    };
  }, [enabled]);

  useEffect(() => {
    unmountedRef.current = false;

    if (enabled) {
      connect();
    } else {
      chatRealtimeStore.getState().setInboxConnectionStatus("disconnected");
    }

    return () => {
      unmountedRef.current = true;
      connectionVersionRef.current += 1;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, enabled]);
}
