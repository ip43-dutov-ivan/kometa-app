import { http } from "msw";
import { apiPath } from "../config";
import { currentUserId, feedback, matches } from "../data";
import type { Feedback } from "../types";
import { createId, error, json, now } from "./utils";

export const feedbackHandlers = [
  http.post(apiPath("/tasks/:taskId/feedback"), async ({ params, request }) => {
    const match = matches.find((item) => item.taskId === params.taskId);

    if (!match) {
      return error("Matched task not found", "match_not_found", 404);
    }

    const receiverId = match.ownerId === currentUserId ? match.providerId : match.ownerId;
    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Pick<Feedback, "rating" | "comment">>;

    const item: Feedback = {
      id: createId("feedback"),
      taskId: match.taskId,
      authorId: currentUserId,
      receiverId,
      rating: input.rating ?? 5,
      comment: input.comment?.trim() || "Good interaction.",
      createdAt: now(),
    };

    feedback.unshift(item);

    return json(item, { status: 201 });
  }),
];
