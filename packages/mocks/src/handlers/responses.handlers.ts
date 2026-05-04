import { http } from "msw";
import { apiPath } from "../config";
import { currentUserId, responses, tasks } from "../data";
import type { TaskResponse } from "../types";
import { createId, error, json, now } from "./utils";

export const responseHandlers = [
  http.get(apiPath("/me/responses"), () => {
    return json(responses.filter((response) => response.providerId === currentUserId));
  }),

  http.get(apiPath("/tasks/:taskId/responses"), ({ params }) => {
    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    return json(responses.filter((response) => response.taskId === params.taskId));
  }),

  http.post(apiPath("/tasks/:taskId/responses"), async ({ params, request }) => {
    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    if (task.ownerId === currentUserId) {
      return error("Task owners cannot respond to their own task", "own_task_response", 403);
    }

    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Pick<TaskResponse, "comment">>;

    const response: TaskResponse = {
      id: createId("response"),
      taskId: task.id,
      providerId: currentUserId,
      comment: input.comment?.trim() || "I can help with this task.",
      status: "pending",
      createdAt: now(),
    };

    responses.unshift(response);

    return json(response, { status: 201 });
  }),
];
