"use client";

import { ReactNode, useCallback } from "react";
import type { ChatServerEvent } from "@kometa/logic";
import { chatRealtimeStore } from "@kometa/logic";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { useUserInboxSocket } from "../hooks/use-user-inbox-socket";

export function ConversationRealtimeProvider({ children }: { children: ReactNode }) {
  const { hasHydrated, isAuthenticated, user } = useKometaSession();

  const handleEvent = useCallback(
    (event: ChatServerEvent) => {
      if (event.type !== "chat.message.created") return;
      chatRealtimeStore.getState().applyChatMessageCreated(event, user?.id);
    },
    [user?.id],
  );

  useUserInboxSocket({
    enabled: hasHydrated && isAuthenticated,
    onEvent: handleEvent,
  });

  return children;
}
