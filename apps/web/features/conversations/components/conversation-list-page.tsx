"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { t } from "@kometa/i18n";
import { chatRealtimeStore, type Conversation, type Task } from "@kometa/logic";
import { useStore } from "zustand";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConversationItem {
  conversation: Conversation;
  task?: Task;
}

export function ConversationListPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const unreadCountsByConversationId = useStore(
    chatRealtimeStore,
    (state) => state.unreadCountsByConversationId,
  );

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
            caughtError instanceof Error ? caughtError.message : t("Conversations failed to load."),
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
        <h1 className="font-heading text-3xl font-semibold">{t("Conversations")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("Task-scoped chats available after a match.")}
        </p>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {isLoading ? (
        <LoadingState label={t("Loading conversations")} />
      ) : items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(({ conversation, task }) => {
            const unreadCount =
              unreadCountsByConversationId[conversation.id] ?? conversation.unreadCount;
            const hasUnreadMessages = unreadCount > 0;

            return (
              <Card
                key={conversation.id}
                className={cn("rounded-lg", hasUnreadMessages && "border-primary/50 bg-primary/5")}
              >
                <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                  <CardTitle className="min-w-0 text-xl">
                    <span className={cn("block truncate", hasUnreadMessages && "font-semibold")}>
                      {task?.title ?? conversation.taskId}
                    </span>
                  </CardTitle>
                  {hasUnreadMessages ? (
                    <Badge className="shrink-0">
                      {unreadCount === 1 ? t("1 new") : `${unreadCount} ${t("new")}`}
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {t("Last message")} {new Date(conversation.lastMessageAt).toLocaleString()}
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    className="w-full"
                    variant={hasUnreadMessages ? "default" : "outline"}
                  >
                    <Link href={`/app/conversations/${conversation.id}`}>
                      <MessageSquare />
                      {hasUnreadMessages ? t("Read new messages") : t("Open chat")}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={t("No conversations")}
          body={t("Chats appear when a task response is accepted.")}
        />
      )}
    </div>
  );
}
