import { http } from "msw";
import { apiPath } from "../config";
import { currentUserId, feedback, matches, tasks } from "../data";
import type { Feedback } from "../types";
import {
  createId,
  error,
  getOtherParticipantId,
  json,
  requireActiveCurrentUser,
  now,
} from "./utils";

export const feedbackHandlers = [
  http.post(apiPath("/tasks/:taskId/feedback"), async ({ params, request }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const match = matches.find(
      (item) =>
        item.taskId === params.taskId &&
        (item.ownerId === currentUserId || item.providerId === currentUserId),
    );

    if (!match) {
      return error("Matched task not found", "match_not_found", 404);
    }

    const task = tasks.find((item) => item.id === match.taskId);

    if (task?.status !== "completed") {
      return error("Feedback can only be left after completion", "feedback_not_allowed", 409);
    }

    if (feedback.some((item) => item.taskId === match.taskId && item.authorId === currentUserId)) {
      return error("Feedback was already left for this task", "feedback_duplicate", 409);
    }

    const receiverId = getOtherParticipantId(match);
    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Pick<Feedback, "rating" | "comment">>;
    const rating = input.rating ?? 5;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return error("Rating must be an integer from 1 to 5", "feedback_rating_invalid", 422);
    }

    const item: Feedback = {
      id: createId("feedback"),
      taskId: match.taskId,
      authorId: currentUserId,
      receiverId,
      rating,
      comment: input.comment?.trim() || "Good interaction.",
      createdAt: now(),
    };

    feedback.unshift(item);

    return json(item, { status: 201 });
  }),

  http.get(apiPath("/tasks/:taskId/feedback"), ({ params }) => {
    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    return json(feedback.filter((item) => item.taskId === params.taskId));
  }),
];
