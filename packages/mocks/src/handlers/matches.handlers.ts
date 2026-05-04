import { http } from "msw";
import { apiPath } from "../config";
import { conversations, currentUserId, matches, responses, tasks } from "../data";
import type { Conversation, Match } from "../types";
import {
  createId,
  error,
  getPagination,
  json,
  pagedListJson,
  requireActiveCurrentUser,
  now,
} from "./utils";

export const matchHandlers = [
  http.get(apiPath("/matches"), ({ request }) => {
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("activeOnly");
    const { limit, offset } = getPagination(url);
    const result = matches.filter((match) => {
      if (match.ownerId !== currentUserId && match.providerId !== currentUserId) {
        return false;
      }

      if (activeOnly !== "true") {
        return true;
      }

      const task = tasks.find((item) => item.id === match.taskId);
      return (
        task?.status === "matched" ||
        task?.status === "inProgress" ||
        task?.status === "completionRequested"
      );
    });

    return pagedListJson(result, limit, offset);
  }),

  http.post(apiPath("/tasks/:taskId/responses/:responseId/accept"), ({ params }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const response = responses.find(
      (item) => item.id === params.responseId && item.taskId === params.taskId,
    );

    if (!response) {
      return error("Response not found", "response_not_found", 404);
    }

    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    if (task.ownerId !== currentUserId) {
      return error("Only the task owner can accept a response", "response_accept_forbidden", 403);
    }

    if (task.status !== "open") {
      return error("Only open tasks can accept responses", "response_accept_not_allowed", 409);
    }

    if (response.status !== "pending") {
      return error("Only pending responses can be accepted", "response_not_pending", 409);
    }

    response.status = "accepted";
    task.status = "matched";
    task.selectedResponseId = response.id;
    task.updatedAt = now();

    for (const item of responses.filter(
      (candidate) => candidate.taskId === task.id && candidate.id !== response.id,
    )) {
      item.status = "declined";
    }

    const conversation: Conversation = {
      id: createId("conversation"),
      taskId: task.id,
      participantIds: [task.ownerId, response.providerId],
      lastMessageAt: now(),
    };

    const match: Match = {
      id: createId("match"),
      taskId: task.id,
      responseId: response.id,
      ownerId: task.ownerId,
      providerId: response.providerId,
      conversationId: conversation.id,
      createdAt: now(),
    };

    conversations.unshift(conversation);
    matches.unshift(match);

    return json(match, { status: 201 });
  }),
];
