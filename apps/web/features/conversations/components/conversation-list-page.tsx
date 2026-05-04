"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { Conversation, Task } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ConversationItem {
  conversation: Conversation;
  task?: Task;
}

export function ConversationListPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadConversations() {
      try {
        const response = await kometaApi.conversations.list();
        const nextItems = await Promise.all(
          response.items.map(async (conversation) => ({
            conversation,
            task: await kometaApi.tasks.get(conversation.taskId).catch(() => undefined),
          })),
        );
        if (isActive) {
          setItems(nextItems);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error ? caughtError.message : "Conversations failed to load.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadConversations();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Conversations</h1>
        <p className="mt-2 text-muted-foreground">Task-scoped chats available after a match.</p>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {isLoading ? (
        <LoadingState label="Loading conversations" />
      ) : items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(({ conversation, task }) => (
            <Card key={conversation.id} className="rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl">{task?.title ?? conversation.taskId}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Last message {new Date(conversation.lastMessageAt).toLocaleString()}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/app/conversations/${conversation.id}`}>
                    <MessageSquare />
                    Open chat
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No conversations"
          body="Chats appear when a task response is accepted."
        />
      )}
    </div>
  );
}
