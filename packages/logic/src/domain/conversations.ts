import type { ConversationId, Message, UserId } from "../api/dtos";

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
