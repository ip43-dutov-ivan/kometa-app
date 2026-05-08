import { createStore } from "zustand/vanilla";
import type { ChatMessageCreatedEvent, ConversationId, Message, UserId } from "../api/dtos";

export type ChatConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type ChatMessageStatus = "sending" | "sent" | "error";

export interface ChatMessage extends Message {
  status: ChatMessageStatus;
  clientMessageId?: string;
}

export interface OptimisticChatMessageInput {
  conversationId: ConversationId;
  senderId: UserId;
  body: string;
  clientMessageId: string;
  createdAt?: string;
}

export function toChatMessage(message: Message): ChatMessage {
  return { ...message, status: "sent" };
}

export function toChronologicalChatMessages(
  messagesNewestFirst: readonly Message[],
): ChatMessage[] {
  return [...messagesNewestFirst].reverse().map(toChatMessage);
}

export function createKnownMessageIds(messages: readonly Message[]): Set<string> {
  return new Set(messages.map((message) => message.id));
}

export function createOptimisticChatMessage(input: OptimisticChatMessageInput): ChatMessage {
  return {
    id: input.clientMessageId,
    conversationId: input.conversationId,
    senderId: input.senderId,
    body: input.body,
    createdAt: input.createdAt ?? new Date().toISOString(),
    status: "sending",
    clientMessageId: input.clientMessageId,
  };
}

export function prependOlderChatMessages(
  currentMessages: readonly ChatMessage[],
  messagesNewestFirst: readonly Message[],
  knownMessageIds: Set<string>,
): ChatMessage[] {
  const olderMessages = toChronologicalChatMessages(messagesNewestFirst).filter(
    (message) => !knownMessageIds.has(message.id),
  );

  olderMessages.forEach((message) => knownMessageIds.add(message.id));

  return [...olderMessages, ...currentMessages];
}

export function applyCreatedChatMessage(
  currentMessages: readonly ChatMessage[],
  knownMessageIds: Set<string>,
  message: Message,
  clientMessageId?: string,
): ChatMessage[] {
  if (knownMessageIds.has(message.id)) {
    return [...currentMessages];
  }

  if (clientMessageId) {
    const optimisticIndex = currentMessages.findIndex(
      (currentMessage) => currentMessage.clientMessageId === clientMessageId,
    );

    if (optimisticIndex !== -1) {
      knownMessageIds.add(message.id);
      const nextMessages = [...currentMessages];
      nextMessages[optimisticIndex] = { ...message, status: "sent", clientMessageId };
      return nextMessages;
    }
  }

  knownMessageIds.add(message.id);
  return [...currentMessages, toChatMessage(message)];
}

export function markSendingChatMessagesFailed(
  currentMessages: readonly ChatMessage[],
): ChatMessage[] {
  return currentMessages.map((message) =>
    message.status === "sending" ? { ...message, status: "error" } : message,
  );
}

export function markChatMessageFailed(
  currentMessages: readonly ChatMessage[],
  clientMessageId: string,
): ChatMessage[] {
  return currentMessages.map((message) =>
    message.clientMessageId === clientMessageId ? { ...message, status: "error" } : message,
  );
}

export interface ChatRealtimeState {
  messagesByConversationId: Record<string, ChatMessage[]>;
  knownMessageIdsByConversationId: Record<string, string[]>;
  unreadCountsByConversationId: Record<string, number>;
  activeConversationId: ConversationId | null;
  inboxConnectionStatus: ChatConnectionStatus;
}

export interface ChatRealtimeActions {
  initializeConversationMessages: (
    conversationId: ConversationId,
    messagesNewestFirst: readonly Message[],
  ) => void;
  prependConversationMessages: (
    conversationId: ConversationId,
    messagesNewestFirst: readonly Message[],
  ) => void;
  appendOptimisticMessage: (input: OptimisticChatMessageInput) => void;
  applyChatMessageCreated: (event: ChatMessageCreatedEvent, currentUserId?: UserId | null) => void;
  applyConversationMessageCreated: (message: Message, clientMessageId?: string) => void;
  markMessageFailed: (conversationId: ConversationId, clientMessageId: string) => void;
  markSendingMessagesFailed: (conversationId: ConversationId) => void;
  markConversationRead: (conversationId: ConversationId) => void;
  setActiveConversationId: (conversationId: ConversationId | null) => void;
  setInboxConnectionStatus: (status: ChatConnectionStatus) => void;
}

export type ChatRealtimeStore = ChatRealtimeState & ChatRealtimeActions;

const initialChatRealtimeState: ChatRealtimeState = {
  messagesByConversationId: {},
  knownMessageIdsByConversationId: {},
  unreadCountsByConversationId: {},
  activeConversationId: null,
  inboxConnectionStatus: "disconnected",
};

const emptyChatMessages: ChatMessage[] = [];

export const chatRealtimeStore = createStore<ChatRealtimeStore>()((set) => ({
  ...initialChatRealtimeState,

  initializeConversationMessages: (conversationId, messagesNewestFirst) =>
    set((state) => {
      const pageMessages = toChronologicalChatMessages(messagesNewestFirst);
      const knownMessageIds = createKnownMessageIds(pageMessages);
      const existingMessages = state.messagesByConversationId[conversationId] ?? [];
      const existingOnlyMessages = existingMessages.filter(
        (message) => !knownMessageIds.has(message.id),
      );
      const messages = [...pageMessages, ...existingOnlyMessages];
      existingOnlyMessages.forEach((message) => knownMessageIds.add(message.id));

      return {
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: messages,
        },
        knownMessageIdsByConversationId: {
          ...state.knownMessageIdsByConversationId,
          [conversationId]: [...knownMessageIds],
        },
      };
    }),

  prependConversationMessages: (conversationId, messagesNewestFirst) =>
    set((state) => {
      const knownMessageIds = getKnownMessageIds(state, conversationId);
      const messages = prependOlderChatMessages(
        state.messagesByConversationId[conversationId] ?? [],
        messagesNewestFirst,
        knownMessageIds,
      );

      return {
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: messages,
        },
        knownMessageIdsByConversationId: {
          ...state.knownMessageIdsByConversationId,
          [conversationId]: [...knownMessageIds],
        },
      };
    }),

  appendOptimisticMessage: (input) =>
    set((state) => ({
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [input.conversationId]: [
          ...(state.messagesByConversationId[input.conversationId] ?? []),
          createOptimisticChatMessage(input),
        ],
      },
    })),

  applyChatMessageCreated: (event, currentUserId) =>
    set((state) => applyChatMessageCreatedState(state, event, currentUserId)),

  applyConversationMessageCreated: (message, clientMessageId) =>
    set((state) => {
      const conversationId = message.conversationId;
      const knownMessageIds = getKnownMessageIds(state, conversationId);
      const messages = applyCreatedChatMessage(
        state.messagesByConversationId[conversationId] ?? [],
        knownMessageIds,
        message,
        clientMessageId,
      );

      return {
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: messages,
        },
        knownMessageIdsByConversationId: {
          ...state.knownMessageIdsByConversationId,
          [conversationId]: [...knownMessageIds],
        },
      };
    }),

  markMessageFailed: (conversationId, clientMessageId) =>
    set((state) => ({
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [conversationId]: markChatMessageFailed(
          state.messagesByConversationId[conversationId] ?? [],
          clientMessageId,
        ),
      },
    })),

  markSendingMessagesFailed: (conversationId) =>
    set((state) => ({
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [conversationId]: markSendingChatMessagesFailed(
          state.messagesByConversationId[conversationId] ?? [],
        ),
      },
    })),

  markConversationRead: (conversationId) =>
    set((state) => ({
      unreadCountsByConversationId: {
        ...state.unreadCountsByConversationId,
        [conversationId]: 0,
      },
    })),

  setActiveConversationId: (conversationId) => set({ activeConversationId: conversationId }),
  setInboxConnectionStatus: (status) => set({ inboxConnectionStatus: status }),
}));

export const selectActiveConversationId = (state: ChatRealtimeStore) => state.activeConversationId;

export const selectInboxConnectionStatus = (state: ChatRealtimeStore) =>
  state.inboxConnectionStatus;

export const selectTotalUnreadChatCount = (state: ChatRealtimeStore) =>
  Object.values(state.unreadCountsByConversationId).reduce((total, count) => total + count, 0);

export const selectConversationMessages =
  (conversationId: ConversationId) => (state: ChatRealtimeStore) =>
    state.messagesByConversationId[conversationId] ?? emptyChatMessages;

export const selectConversationUnreadCount =
  (conversationId: ConversationId) => (state: ChatRealtimeStore) =>
    state.unreadCountsByConversationId[conversationId] ?? 0;

function applyChatMessageCreatedState(
  state: ChatRealtimeState,
  event: ChatMessageCreatedEvent,
  currentUserId?: UserId | null,
): Partial<ChatRealtimeState> {
  const conversationId = event.conversationId;
  const knownMessageIds = getKnownMessageIds(state, conversationId);
  const alreadyKnown = knownMessageIds.has(event.message.id);
  const messages = applyCreatedChatMessage(
    state.messagesByConversationId[conversationId] ?? [],
    knownMessageIds,
    event.message,
    event.clientMessageId,
  );
  const shouldIncrementUnread =
    !alreadyKnown &&
    state.activeConversationId !== conversationId &&
    Boolean(currentUserId) &&
    event.message.senderId !== currentUserId;

  return {
    messagesByConversationId: {
      ...state.messagesByConversationId,
      [conversationId]: messages,
    },
    knownMessageIdsByConversationId: {
      ...state.knownMessageIdsByConversationId,
      [conversationId]: [...knownMessageIds],
    },
    unreadCountsByConversationId: shouldIncrementUnread
      ? {
          ...state.unreadCountsByConversationId,
          [conversationId]: (state.unreadCountsByConversationId[conversationId] ?? 0) + 1,
        }
      : state.unreadCountsByConversationId,
  };
}

function getKnownMessageIds(state: ChatRealtimeState, conversationId: ConversationId): Set<string> {
  return new Set(state.knownMessageIdsByConversationId[conversationId] ?? []);
}
