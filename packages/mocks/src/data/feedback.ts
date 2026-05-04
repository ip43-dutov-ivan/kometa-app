import type { Feedback } from "../types";

export const feedback: Feedback[] = [
  {
    id: "feedback-1",
    taskId: "task-4",
    authorId: "user-2",
    receiverId: "user-1",
    rating: 5,
    comment: "Clear brief and quick replies throughout the review.",
    createdAt: "2026-05-04T18:12:00.000Z",
  },
  {
    id: "feedback-2",
    taskId: "task-4",
    authorId: "user-1",
    receiverId: "user-2",
    rating: 5,
    comment: "Detailed comments that made the case study much easier to read.",
    createdAt: "2026-05-04T18:20:00.000Z",
  },
];
