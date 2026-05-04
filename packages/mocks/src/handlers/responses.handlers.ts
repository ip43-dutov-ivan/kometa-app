import { http } from "msw";
import { apiPath } from "../config";
import { currentUserId, responses, tasks } from "../data";
import type { ResponseStatus, TaskResponse } from "../types";
import {
  createId,
  error,
  getPagination,
  json,
  pagedListJson,
  requireActiveCurrentUser,
  now,
} from "./utils";

export const responseHandlers = [
  http.get(apiPath("/me/responses"), ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as ResponseStatus | null;
    const { limit, offset } = getPagination(url);
    const result = responses.filter((response) => {
      if (response.providerId !== currentUserId) {
        return false;
      }

      return !status || response.status === status;
    });

    return pagedListJson(result, limit, offset);
  }),

  http.get(apiPath("/tasks/:taskId/responses"), ({ params, request }) => {
    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    if (task.ownerId !== currentUserId) {
      return error("Only the task owner can view responses", "task_responses_forbidden", 403);
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") as ResponseStatus | null;
    const { limit, offset } = getPagination(url);
    const result = responses.filter((response) => {
      if (response.taskId !== params.taskId) {
        return false;
      }

      return !status || response.status === status;
    });

    return pagedListJson(result, limit, offset);
  }),

  http.post(apiPath("/tasks/:taskId/responses"), async ({ params, request }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    if (task.ownerId === currentUserId) {
      return error("Task owners cannot respond to their own task", "own_task_response", 403);
    }

    if (task.status !== "open") {
      return error("Only open tasks can receive responses", "task_response_not_allowed", 409);
    }

    if (
      responses.some(
        (response) =>
          response.taskId === task.id &&
          response.providerId === currentUserId &&
          response.status !== "withdrawn",
      )
    ) {
      return error("You have already responded to this task", "task_response_duplicate", 409);
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
