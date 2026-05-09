"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatClientEvent, ChatServerEvent } from "@kometa/logic";
import { kometaSessionStore } from "@kometa/logic";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface Options {
  conversationId: string;
  onEvent: (event: ChatServerEvent) => void;
}

export function useConversationSocket({ conversationId, onEvent }: Options) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const unmountedRef = useRef(false);

  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const token = kometaSessionStore.getState().accessToken;
    if (!token) return;

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
    const url = `${proto}//${wsHost}/ws/conversations/${conversationId}/?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      if (unmountedRef.current) {
        ws.close();
        return;
      }
      setStatus("connected");
      attemptsRef.current = 0;
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as ChatServerEvent;
        onEventRef.current(data);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      wsRef.current = null;
      setStatus("disconnected");
      // exponential backoff: 1 s → 2 s → 4 s → … max 16 s
      const delay = Math.min(1000 * 2 ** attemptsRef.current, 16_000);
      attemptsRef.current += 1;
      reconnectRef.current = setTimeout(connect, delay);
    };
  }, [conversationId]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback((clientMessageId: string, body: string): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    const event: ChatClientEvent = { type: "message.create", body, clientMessageId };
    ws.send(JSON.stringify(event));
    return true;
  }, []);

  const sendRead = useCallback((): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    const event: ChatClientEvent = { type: "conversation.read" };
    ws.send(JSON.stringify(event));
    return true;
  }, []);

  return { status, send, sendRead };
}
