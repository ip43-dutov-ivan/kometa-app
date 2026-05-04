import { http } from "msw";
import { apiPath } from "../config";
import { currentUserId, tasks, users } from "../data";
import type { Task } from "../types";
import { error, json, listJson } from "../handlers/utils";

export const routeEmptyStateHandlers = [
  http.get(apiPath("/tasks"), ({ request }) => {
    const url = new URL(request.url);

    if (
      url.searchParams.get("available") === "true" ||
      url.searchParams.get("owner") === "me" ||
      url.searchParams.get("involved") === "me"
    ) {
      return listJson([]);
    }

    return listJson([]);
  }),
  http.get(apiPath("/tasks/:taskId/responses"), () => listJson([])),
  http.get(apiPath("/me/responses"), () => listJson([])),
  http.get(apiPath("/matches"), () => listJson([])),
  http.get(apiPath("/conversations"), () => listJson([])),
  http.get(apiPath("/admin/reports"), () => listJson([])),
];

export const blockedAccountHandlers = [
  http.get(apiPath("/users/me"), () => {
    const currentUser = users.find((user) => user.id === currentUserId);

    if (!currentUser) {
      return error("Current user not found", "user_not_found", 404);
    }

    return json({
      ...currentUser,
      accountStatus: "blocked",
      blockedReason: "Demo state: account is blocked for route testing.",
      blockedAt: "2026-05-05T12:00:00.000Z",
    });
  }),
  http.post(apiPath("/tasks"), () =>
    error("Blocked users cannot create tasks", "account_blocked", 403),
  ),
  http.post(apiPath("/tasks/:taskId/responses"), () =>
    error("Blocked users cannot respond to tasks", "account_blocked", 403),
  ),
  http.post(apiPath("/conversations/:conversationId/messages"), () =>
    error("Blocked users cannot send messages", "account_blocked", 403),
  ),
  http.post(apiPath("/reports"), () =>
    error("Blocked users cannot create reports", "account_blocked", 403),
  ),
];

export const taskDetailStateHandlers = {
  openOwner: taskStateHandler("task-0", "open"),
  matched: taskStateHandler("task-2", "matched"),
  inProgress: taskStateHandler("task-6", "inProgress"),
  completionRequested: taskStateHandler("task-5", "completionRequested"),
  completed: taskStateHandler("task-4", "completed"),
};

function taskStateHandler(taskId: string, status: Task["status"]) {
  return http.get(apiPath(`/tasks/${taskId}`), () => {
    const task = tasks.find((item) => item.id === taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    return json({
      ...task,
      status,
      updatedAt: "2026-05-05T12:00:00.000Z",
    });
  });
}
