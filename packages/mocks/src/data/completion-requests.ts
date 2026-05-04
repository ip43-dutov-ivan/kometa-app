import type { CompletionRequest } from "../types";

export const completionRequests: CompletionRequest[] = [
  {
    id: "completion-request-1",
    taskId: "task-4",
    requestedByUserId: "user-2",
    confirmedByUserId: "user-1",
    status: "confirmed",
    note: "Presentation review is done and notes were sent.",
    createdAt: "2026-05-04T17:40:00.000Z",
    updatedAt: "2026-05-04T18:05:00.000Z",
  },
  {
    id: "completion-request-2",
    taskId: "task-5",
    requestedByUserId: "user-1",
    status: "pending",
    note: "Router is configured, please check the signal in the bedroom.",
    createdAt: "2026-05-05T11:45:00.000Z",
    updatedAt: "2026-05-05T11:45:00.000Z",
  },
];
