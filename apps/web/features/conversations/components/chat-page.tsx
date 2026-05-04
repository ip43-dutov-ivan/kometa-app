"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Send, ShieldAlert } from "lucide-react";
import type { Conversation, Message, Task } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function ChatPage({ conversationId }: { conversationId: string }) {
  const { user } = useKometaSession();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const loadChat = useCallback(async () => {
    setError(null);
    try {
      const nextConversation = await kometaApi.conversations.get(conversationId);
      const [nextMessages, nextTask] = await Promise.all([
        kometaApi.conversations.listMessages(conversationId),
        kometaApi.tasks.get(nextConversation.taskId).catch(() => null),
      ]);
      setConversation(nextConversation);
      setMessages(nextMessages);
      setTask(nextTask);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Chat failed to load.");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = String(formData.get("body") ?? "").trim();
    if (!body) {
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      const message = await kometaApi.conversations.sendMessage(conversationId, { body });
      setMessages((current) => [...current, message]);
      form.reset();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Message failed to send.");
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading chat" />;
  }

  if (!conversation) {
    return error ? <ErrorState message={error} /> : <EmptyState title="Conversation not found" />;
  }

  const otherUserId = conversation.participantIds.find(
    (participantId) => participantId !== user?.id,
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{task?.title ?? "Task chat"}</h1>
          <p className="mt-2 text-muted-foreground">Coordinate details after the match.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/app/tasks/${conversation.taskId}`}>Task</Link>
          </Button>
          {otherUserId ? (
            <Button asChild variant="ghost">
              <Link
                href={`/app/reports/new?reportedUserId=${otherUserId}&taskId=${conversation.taskId}`}
              >
                <ShieldAlert />
                Report
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <ErrorState message={error} /> : null}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="grid max-h-[55vh] gap-3 overflow-y-auto">
          {messages.length ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-lg border p-3 ${
                  message.senderId === user?.id
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm leading-6">{message.body}</p>
                <p className="mt-1 text-xs opacity-75">
                  {new Date(message.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <EmptyState title="No messages yet" body="Send the first coordination message." />
          )}
        </CardContent>
      </Card>
      <form className="grid gap-3 rounded-lg border p-4" onSubmit={sendMessage}>
        <Textarea name="body" rows={3} placeholder="Write a message" required />
        <Button type="submit" disabled={isSending} className="justify-self-end">
          <Send />
          {isSending ? "Sending" : "Send"}
        </Button>
      </form>
    </div>
  );
}
