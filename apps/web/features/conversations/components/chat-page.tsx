"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Send, ShieldAlert } from "lucide-react";
import { t } from "@kometa/i18n";
import {
  applyCreatedChatMessage,
  createKnownMessageIds,
  createOptimisticChatMessage,
  markChatMessageFailed,
  markSendingChatMessagesFailed,
  prependOlderChatMessages,
  toChronologicalChatMessages,
  type ChatMessage,
  type ChatServerEvent,
  type Conversation,
  type Task,
} from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useConversationSocket } from "../hooks/use-conversation-socket";

export function ChatPage({ conversationId }: { conversationId: string }) {
  const { user } = useKometaSession();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showNewMessages, setShowNewMessages] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const knownIdsRef = useRef(new Set<string>());

  // ── helpers ──────────────────────────────────────────────────────────────

  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  };

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setShowNewMessages(false);
  }, []);

  // ── initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError(null);
      try {
        const nextConversation = await kometaApi.conversations.get(conversationId);
        const [messagesResponse, nextTask] = await Promise.all([
          kometaApi.conversations.listMessages(conversationId, { limit: 50 }),
          kometaApi.tasks.get(nextConversation.taskId).catch(() => null),
        ]);
        if (cancelled) return;

        const nextMessages = toChronologicalChatMessages(messagesResponse.items);
        knownIdsRef.current = createKnownMessageIds(nextMessages);

        setConversation(nextConversation);
        setTask(nextTask);
        setMessages(nextMessages);
        setHasMore(messagesResponse.pageInfo.hasMore);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : t("Chat failed to load."));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // scroll to bottom once initial messages are ready
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      requestAnimationFrame(scrollToBottom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ── load older messages ───────────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    setIsLoadingMore(true);

    const oldestCreatedAt = messages[0].createdAt;
    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;

    try {
      const response = await kometaApi.conversations.listMessages(conversationId, {
        before: oldestCreatedAt,
        limit: 50,
      });
      setMessages((prev) => prependOlderChatMessages(prev, response.items, knownIdsRef.current));
      setHasMore(response.pageInfo.hasMore);

      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    } catch {
      // silently ignore — user can scroll up again to retry
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, hasMore, isLoadingMore, messages]);

  // ── scroll handler ────────────────────────────────────────────────────────

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasMore && !isLoadingMore) {
      loadMore();
    }
    if (isNearBottom()) {
      setShowNewMessages(false);
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // ── WebSocket ─────────────────────────────────────────────────────────────

  const handleWsEvent = useCallback(
    (event: ChatServerEvent) => {
      if (event.type === "error") {
        setSendError(event.message);
        setMessages(markSendingChatMessagesFailed);
        return;
      }

      if (event.type !== "message.created") return;

      const { message, clientMessageId } = event;

      setMessages((prev) =>
        applyCreatedChatMessage(prev, knownIdsRef.current, message, clientMessageId),
      );

      if (isNearBottom()) {
        requestAnimationFrame(scrollToBottom);
      } else if (message.senderId !== user?.id) {
        setShowNewMessages(true);
      }
    },
    [user?.id, scrollToBottom],
  );

  const { status: wsStatus, send: sendWsMessage } = useConversationSocket({
    conversationId,
    onEvent: handleWsEvent,
  });

  // ── send ──────────────────────────────────────────────────────────────────

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = ((new FormData(form).get("body") as string) ?? "").trim();
    if (!body || !user) return;

    setSendError(null);

    if (wsStatus !== "connected") {
      setSendError(t("Chat is reconnecting. Try again in a moment."));
      return;
    }

    const clientMessageId = crypto.randomUUID();
    const optimistic = createOptimisticChatMessage({
      conversationId,
      senderId: user.id,
      body,
      clientMessageId,
    });

    setMessages((prev) => [...prev, optimistic]);
    form.reset();

    const sent = sendWsMessage(clientMessageId, body);

    if (!sent) {
      setSendError(t("Chat is reconnecting. Try again in a moment."));
      setMessages((prev) => markChatMessageFailed(prev, clientMessageId));
    }

    if (isNearBottom()) requestAnimationFrame(scrollToBottom);
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingState label={t("Loading chat")} />;

  if (!conversation) {
    return loadError ? (
      <ErrorState message={loadError} />
    ) : (
      <EmptyState title={t("Conversation not found")} />
    );
  }

  const otherUserId = conversation.participantIds.find((id) => id !== user?.id);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{task?.title ?? t("Task chat")}</h1>
          <p className="mt-2 text-muted-foreground">{t("Coordinate details after the match.")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/app/tasks/${conversation.taskId}`}>{t("Task")}</Link>
          </Button>
          {otherUserId ? (
            <Button asChild variant="ghost">
              <Link
                href={`/app/reports/new?reportedUserId=${otherUserId}&taskId=${conversation.taskId}`}
              >
                <ShieldAlert />
                {t("Report")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {sendError ? <ErrorState message={sendError} /> : null}

      <div className="relative">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{t("Messages")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingMore ? (
              <div className="px-6 pt-3">
                <LoadingState label={t("Loading older messages")} />
              </div>
            ) : null}
            <div
              ref={scrollRef}
              className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto px-6 pb-6 pt-2"
              onScroll={handleScroll}
            >
              {messages.length ? (
                messages.map((message) => (
                  <div
                    key={message.clientMessageId ?? message.id}
                    className={`max-w-[85%] rounded-lg border p-3 ${
                      message.senderId === user?.id
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    } ${message.status === "error" ? "border-destructive opacity-70" : ""}`}
                  >
                    <p className="text-sm leading-6">{message.body}</p>
                    <p className="mt-1 text-xs opacity-75">
                      {message.status === "sending"
                        ? t("Sending…")
                        : message.status === "error"
                          ? t("Failed to send")
                          : new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title={t("No messages yet")}
                  body={t("Send the first coordination message.")}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {showNewMessages ? (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground shadow"
          >
            <ArrowDown className="h-3 w-3" />
            {t("New messages")}
          </button>
        ) : null}
      </div>

      <form className="grid gap-3 rounded-lg border p-4" onSubmit={handleSend}>
        <Textarea name="body" rows={3} placeholder={t("Write a message")} required />
        <Button type="submit" disabled={wsStatus !== "connected"} className="justify-self-end">
          <Send />
          {t("Send")}
        </Button>
      </form>
    </div>
  );
}
