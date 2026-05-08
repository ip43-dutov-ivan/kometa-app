"use client";

import { ReactNode, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { t } from "@kometa/i18n";
import type { ChatServerEvent, Task, TaskId } from "@kometa/logic";
import { chatRealtimeStore } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { useUserInboxSocket } from "../hooks/use-user-inbox-socket";

const messagePreviewLength = 100;
const rememberedToastMessageLimit = 200;

interface TaskToastMetadata {
  title: Task["title"];
  ownerId: Task["ownerId"];
}

export function ConversationRealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { hasHydrated, isAuthenticated, user } = useKometaSession();
  const currentUserId = user?.id;
  const taskMetadataCacheRef = useRef<Map<TaskId, Promise<TaskToastMetadata | null>>>(new Map());
  const toastedMessageIdsRef = useRef<Set<string>>(new Set());

  const getTaskMetadata = useCallback((taskId: TaskId) => {
    const cachedTask = taskMetadataCacheRef.current.get(taskId);
    if (cachedTask) return cachedTask;

    const taskPromise = kometaApi.tasks
      .get(taskId)
      .then((task) => ({ title: task.title, ownerId: task.ownerId }))
      .catch(() => {
        taskMetadataCacheRef.current.delete(taskId);
        return null;
      });

    taskMetadataCacheRef.current.set(taskId, taskPromise);
    return taskPromise;
  }, []);

  const showIncomingMessageToast = useCallback(
    async (event: Extract<ChatServerEvent, { type: "chat.message.created" }>) => {
      if (!currentUserId || event.message.senderId === currentUserId) return;
      if (chatRealtimeStore.getState().activeConversationId === event.conversationId) return;
      if (!rememberToastMessageId(toastedMessageIdsRef.current, event.message.id)) return;

      const taskMetadata = await getTaskMetadata(event.taskId);
      if (chatRealtimeStore.getState().activeConversationId === event.conversationId) return;

      const preview = formatMessagePreview(event.message.body);
      const ownershipLabel = taskMetadata
        ? taskMetadata.ownerId === currentUserId
          ? t("My task")
          : t("Task I responded to")
        : null;
      const description = [ownershipLabel, preview].filter(Boolean).join(" - ");
      const toastId = toast(taskMetadata?.title ?? t("Task chat"), {
        description,
        action: {
          label: t("Open chat"),
          onClick: () => {
            toast.dismiss(toastId);
            router.push(`/app/conversations/${event.conversationId}`);
          },
        },
      });
    },
    [currentUserId, getTaskMetadata, router],
  );

  const handleEvent = useCallback(
    (event: ChatServerEvent) => {
      if (event.type !== "chat.message.created") return;
      chatRealtimeStore.getState().applyChatMessageCreated(event, currentUserId);
      void showIncomingMessageToast(event);
    },
    [currentUserId, showIncomingMessageToast],
  );

  useUserInboxSocket({
    enabled: hasHydrated && isAuthenticated,
    onEvent: handleEvent,
  });

  return children;
}

function formatMessagePreview(body: string) {
  const normalizedBody = body.trim().replace(/\s+/g, " ");

  if (normalizedBody.length <= messagePreviewLength) {
    return normalizedBody;
  }

  return `${normalizedBody.slice(0, messagePreviewLength - 1)}…`;
}

function rememberToastMessageId(messageIds: Set<string>, messageId: string) {
  if (messageIds.has(messageId)) return false;

  messageIds.add(messageId);

  if (messageIds.size > rememberedToastMessageLimit) {
    const oldestMessageId = messageIds.values().next().value;
    if (oldestMessageId) {
      messageIds.delete(oldestMessageId);
    }
  }

  return true;
}
