"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, MessageSquare, UserCheck } from "lucide-react";
import { t } from "@kometa/i18n";
import {
  buildOwnTasksQuery,
  chatRealtimeStore,
  type Match,
  type Task,
  type TaskResponse,
  type User,
} from "@kometa/logic";
import { useStore } from "zustand";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type InboxFilter = "all" | "unread" | "responses" | "matches";

type InboxItem =
  | {
      id: string;
      type: "chat";
      conversationId: string;
      taskId: string;
      title: string;
      body: string;
      updatedAt: string;
      href: string;
      actionLabel: string;
      unreadCount: number;
      task?: Task;
      match?: Match;
      otherUser?: User;
    }
  | {
      id: string;
      type: "my-response";
      taskId: string;
      title: string;
      body: string;
      updatedAt: string;
      href: string;
      actionLabel: string;
      response: TaskResponse;
      task?: Task;
    }
  | {
      id: string;
      type: "candidate-responses";
      taskId: string;
      title: string;
      body: string;
      updatedAt: string;
      href: string;
      actionLabel: string;
      pendingCount: number;
      task: Task;
    };

const filterOptions: Array<{ value: InboxFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "responses", label: "Responses" },
  { value: "matches", label: "Matches" },
];

export function ConversationListPage() {
  const { user } = useKometaSession();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const unreadCountsByConversationId = useStore(
    chatRealtimeStore,
    (state) => state.unreadCountsByConversationId,
  );

  useEffect(() => {
    let isActive = true;

    async function loadInbox() {
      try {
        const [conversationList, matchList, myResponseList, ownTaskList] = await Promise.all([
          kometaApi.conversations.list(),
          kometaApi.matches.list({ activeOnly: true }).catch(() => ({ items: [] as Match[] })),
          kometaApi.responses.listMine().catch(() => ({ items: [] as TaskResponse[] })),
          kometaApi.tasks.list(buildOwnTasksQuery()).catch(() => ({ items: [] as Task[] })),
        ]);

        const taskIds = new Set<string>();
        for (const conversation of conversationList.items) taskIds.add(conversation.taskId);
        for (const response of myResponseList.items) taskIds.add(response.taskId);
        for (const task of ownTaskList.items) taskIds.add(task.id);

        const taskPairs: Array<readonly [string, Task | undefined]> = await Promise.all(
          Array.from(taskIds).map(async (taskId) => {
            const task = await kometaApi.tasks.get(taskId).catch(() => undefined);
            return [taskId, task] as const;
          }),
        );
        const taskById = new Map(taskPairs);
        const matchByConversationId = new Map(
          matchList.items.map((match) => [match.conversationId, match]),
        );
        const acceptedResponseIds = new Set(matchList.items.map((match) => match.responseId));

        const otherUserIds = new Set<string>();
        for (const match of matchList.items) {
          const currentUserId = user?.id ? String(user.id) : undefined;
          const otherUserId = match.ownerId === currentUserId ? match.providerId : match.ownerId;
          otherUserIds.add(otherUserId);
        }

        const userPairs: Array<readonly [string, User | undefined]> = await Promise.all(
          Array.from(otherUserIds).map(async (userId) => {
            const matchedUser = await kometaApi.users.getById(userId).catch(() => undefined);
            return [userId, matchedUser] as const;
          }),
        );
        const userById = new Map(userPairs);

        const chatItems: InboxItem[] = conversationList.items.map((conversation) => {
          const task = taskById.get(conversation.taskId);
          const match = matchByConversationId.get(conversation.id);
          const currentUserId = user?.id ? String(user.id) : undefined;
          const otherUserId =
            match && currentUserId
              ? match.ownerId === currentUserId
                ? match.providerId
                : match.ownerId
              : undefined;
          const otherUser = otherUserId ? userById.get(otherUserId) : undefined;

          return {
            id: `chat-${conversation.id}`,
            type: "chat",
            conversationId: conversation.id,
            taskId: conversation.taskId,
            title: task?.title ?? conversation.taskId,
            body: otherUser
              ? `${t("Matched with")} ${otherUser.name}`
              : t("Task-scoped chats available after a match."),
            updatedAt: conversation.lastMessageAt,
            href: `/app/conversations/${conversation.id}`,
            actionLabel: t("Open chat"),
            unreadCount: conversation.unreadCount,
            task,
            match,
            otherUser,
          };
        });

        const responseItems: InboxItem[] = myResponseList.items
          .filter((response) => !acceptedResponseIds.has(response.id))
          .map((response) => {
            const task = taskById.get(response.taskId);

            return {
              id: `response-${response.id}`,
              type: "my-response",
              taskId: response.taskId,
              title: task?.title ?? response.taskId,
              body: response.comment,
              updatedAt: response.createdAt,
              href: `/app/tasks/${response.taskId}`,
              actionLabel: t("Open task"),
              response,
              task,
            };
          });

        const candidateItemPromises: Array<Promise<InboxItem | null>> = ownTaskList.items
          .filter((task) => task.status === "open")
          .map(async (task): Promise<InboxItem | null> => {
            const responseList = await kometaApi.tasks
              .listResponses(task.id, { status: "pending", limit: 1 })
              .catch(() => ({ pageInfo: { total: 0 } }));
            const pendingCount = responseList.pageInfo.total;

            if (!pendingCount) {
              return null;
            }

            return {
              id: `candidate-responses-${task.id}`,
              type: "candidate-responses",
              taskId: task.id,
              title: task.title,
              body:
                pendingCount === 1
                  ? t("1 candidate is waiting for review.")
                  : `${pendingCount} ${t("candidates are waiting for review.")}`,
              updatedAt: task.updatedAt,
              href: `/app/tasks/${task.id}/responses`,
              actionLabel: t("Review responses"),
              pendingCount,
              task,
            };
          });
        const candidateItems = (await Promise.all(candidateItemPromises)).filter(isInboxItem);

        const nextItems = [...candidateItems, ...chatItems, ...responseItems].sort(
          (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
        );

        if (isActive) {
          setItems(nextItems);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(caughtError instanceof Error ? caughtError.message : t("Inbox failed to load."));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadInbox();
    return () => {
      isActive = false;
    };
  }, [user?.id]);

  const visibleItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "unread") return getUnreadCount(item, unreadCountsByConversationId) > 0;
    if (filter === "responses") return item.type !== "chat";
    if (filter === "matches") return item.type === "chat";
    return true;
  });

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{t("Inbox")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("Task responses, matches, and chats in one place.")}
          </p>
        </div>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => {
            if (value) setFilter(value as InboxFilter);
          }}
          variant="outline"
          className="w-full flex-wrap sm:w-auto"
        >
          {filterOptions.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} className="px-3">
              {t(option.label)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {isLoading ? (
        <LoadingState label={t("Loading inbox")} />
      ) : visibleItems.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleItems.map((item) => (
            <InboxCard
              key={item.id}
              item={item}
              unreadCount={getUnreadCount(item, unreadCountsByConversationId)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={filter === "all" ? t("No inbox items") : t("Nothing matches this filter")}
          body={t("Responses, matches, and chats appear here as your tasks move forward.")}
        />
      )}
    </div>
  );
}

function isInboxItem(item: InboxItem | null): item is InboxItem {
  return item !== null;
}

function getUnreadCount(
  item: InboxItem,
  unreadCountsByConversationId: Record<string, number>,
): number {
  return item.type === "chat"
    ? (unreadCountsByConversationId[item.conversationId] ?? item.unreadCount)
    : 0;
}

function InboxCard({ item, unreadCount }: { item: InboxItem; unreadCount: number }) {
  const hasUnreadMessages = item.type === "chat" && unreadCount > 0;
  const isResponseReview = item.type === "candidate-responses";
  const isMyResponse = item.type === "my-response";

  return (
    <Card className={cn("rounded-lg", hasUnreadMessages && "border-primary/50 bg-primary/5")}>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {item.type === "chat" ? <Badge>{t("Matched")}</Badge> : null}
          {isMyResponse ? <Badge>{t("Response")}</Badge> : null}
          {isResponseReview ? <Badge>{t("Responses")}</Badge> : null}
          {item.type === "chat" && hasUnreadMessages ? (
            <Badge variant="secondary">
              {unreadCount === 1 ? t("1 new") : `${unreadCount} ${t("new")}`}
            </Badge>
          ) : null}
          {item.type === "chat" && item.task ? (
            <Badge variant="outline">{t(item.task.status)}</Badge>
          ) : null}
          {item.type === "my-response" ? (
            <Badge variant="outline">{t(item.response.status)}</Badge>
          ) : null}
          {item.type === "candidate-responses" ? (
            <Badge variant="outline">
              {item.pendingCount === 1 ? t("1 pending") : `${item.pendingCount} ${t("pending")}`}
            </Badge>
          ) : null}
        </div>
        <CardTitle className="min-w-0 text-xl">
          <span className={cn("block truncate", hasUnreadMessages && "font-semibold")}>
            {item.title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <p className="line-clamp-3 leading-6 text-muted-foreground">{item.body}</p>
        <p className="mt-2 text-muted-foreground">
          {item.type === "chat"
            ? `${t("Last message")} ${new Date(item.updatedAt).toLocaleString()}`
            : `${t("Updated")} ${new Date(item.updatedAt).toLocaleDateString()}`}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" variant={hasUnreadMessages ? "default" : "outline"}>
          <Link href={item.href}>
            {item.type === "chat" ? (
              <MessageSquare />
            ) : isResponseReview ? (
              <UserCheck />
            ) : (
              <ExternalLink />
            )}
            {hasUnreadMessages ? t("Read new messages") : item.actionLabel}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
