import { http } from "msw";
import { apiPath } from "../config";
import { conversations, matches, responses, tasks } from "../data";
import type { Conversation, Match } from "../types";
import { createId, error, json, listJson, now } from "./utils";

export const matchHandlers = [
  http.get(apiPath("/matches"), () => {
    return listJson(matches);
  }),

  http.post(apiPath("/tasks/:taskId/responses/:responseId/accept"), ({ params }) => {
    const response = responses.find((item) => item.id === params.responseId);

    if (!response) {
      return error("Response not found", "response_not_found", 404);
    }

    const task = tasks.find((item) => item.id === response.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    response.status = "accepted";
    task.status = "matched";
    task.selectedResponseId = response.id;

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
