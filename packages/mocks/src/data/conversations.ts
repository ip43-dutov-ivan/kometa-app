import type { ChatMessage, Conversation } from "../types";

export const conversations: Conversation[] = [
  {
    id: "conversation-1",
    taskId: "task-2",
    participantIds: ["user-1", "user-2"],
    lastMessageAt: "2026-05-02T16:20:00.000Z",
    unreadCount: 1,
    readStates: [
      { userId: "user-1", lastReadAt: "2026-05-02T16:20:00.000Z" },
      { userId: "user-2", lastReadAt: "2026-05-02T16:10:00.000Z" },
    ],
  },
  {
    id: "conversation-2",
    taskId: "task-4",
    participantIds: ["user-1", "user-2"],
    lastMessageAt: "2026-05-04T17:35:00.000Z",
    unreadCount: 0,
    readStates: [
      { userId: "user-1", lastReadAt: "2026-05-04T17:35:00.000Z" },
      { userId: "user-2", lastReadAt: "2026-05-04T17:35:00.000Z" },
    ],
  },
  {
    id: "conversation-3",
    taskId: "task-5",
    participantIds: ["user-2", "user-1"],
    lastMessageAt: "2026-05-05T11:45:00.000Z",
    unreadCount: 0,
    readStates: [
      { userId: "user-1", lastReadAt: "2026-05-05T11:45:00.000Z" },
      { userId: "user-2", lastReadAt: "2026-05-05T11:45:00.000Z" },
    ],
  },
  {
    id: "conversation-4",
    taskId: "task-6",
    participantIds: ["user-3", "user-1"],
    lastMessageAt: "2026-05-05T09:00:00.000Z",
    unreadCount: 1,
    readStates: [
      { userId: "user-1", lastReadAt: "2026-05-05T09:00:00.000Z" },
      { userId: "user-3", lastReadAt: "2026-05-05T08:45:00.000Z" },
    ],
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
  {
    id: "message-3",
    conversationId: "conversation-2",
    senderId: "user-1",
    body: "I added comments on the case study flow and the results section.",
    createdAt: "2026-05-04T17:35:00.000Z",
  },
  {
    id: "message-4",
    conversationId: "conversation-3",
    senderId: "user-1",
    body: "The mesh nodes are paired. Can you check if the bedroom speed is stable now?",
    createdAt: "2026-05-05T11:45:00.000Z",
  },
  {
    id: "message-5",
    conversationId: "conversation-4",
    senderId: "user-3",
    body: "Can we focus on chain rule examples first?",
    createdAt: "2026-05-05T08:45:00.000Z",
  },
  {
    id: "message-6",
    conversationId: "conversation-4",
    senderId: "user-1",
    body: "Yes, I will start there and then we can do two quiz-style problems.",
    createdAt: "2026-05-05T09:00:00.000Z",
  },
];
