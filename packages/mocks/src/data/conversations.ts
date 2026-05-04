import type { ChatMessage, Conversation } from "../types";

export const conversations: Conversation[] = [
  {
    id: "conversation-1",
    taskId: "task-2",
    participantIds: ["user-1", "user-2"],
    lastMessageAt: "2026-05-02T16:20:00.000Z",
  },
];

export const messages: ChatMessage[] = [
  {
    id: "message-1",
    conversationId: "conversation-1",
    senderId: "user-2",
    body: "Send me the slides and I will leave comments by the evening.",
    createdAt: "2026-05-02T16:10:00.000Z",
  },
  {
    id: "message-2",
    conversationId: "conversation-1",
    senderId: "user-1",
    body: "Thanks, I will upload the latest version in a few minutes.",
    createdAt: "2026-05-02T16:20:00.000Z",
  },
];
