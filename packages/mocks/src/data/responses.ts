import type { TaskResponse } from "../types";

export const responses: TaskResponse[] = [
  {
    id: "response-1",
    taskId: "task-1",
    providerId: "user-1",
    comment: "I can come this evening and configure it in about an hour.",
    status: "pending",
    createdAt: "2026-05-01T11:15:00.000Z",
  },
  {
    id: "response-2",
    taskId: "task-2",
    providerId: "user-2",
    comment: "I can review the structure and pronunciation notes today.",
    status: "accepted",
    createdAt: "2026-05-02T15:05:00.000Z",
  },
];
