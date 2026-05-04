import { http } from "msw";
import { apiPath } from "../config";
import { currentUserId, tasks } from "../data";
import type { Task, TaskStatus } from "../types";
import { createId, error, json, now } from "./utils";

export const taskHandlers = [
  http.get(apiPath("/tasks"), ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as TaskStatus | null;
    const mine = url.searchParams.get("mine");

    const result = tasks.filter((task) => {
      if (status && task.status !== status) {
        return false;
      }

      if (mine === "created" && task.ownerId !== currentUserId) {
        return false;
      }

      if (mine === "available" && task.ownerId === currentUserId) {
        return false;
      }

      return true;
    });

    return json(result);
  }),

  http.post(apiPath("/tasks"), async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Task>;

    const task: Task = {
      id: createId("task"),
      title: input.title?.trim() || "Untitled task",
      description: input.description?.trim() || "No description provided.",
      category: input.category?.trim() || "General",
      location: input.location?.trim() || "Remote",
      compensation: input.compensation ?? { type: "money", amount: 0, currency: "UAH" },
      status: "open",
      ownerId: currentUserId,
      createdAt: now(),
    };

    tasks.unshift(task);

    return json(task, { status: 201 });
  }),

  http.get(apiPath("/tasks/:taskId"), ({ params }) => {
    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    return json(task);
  }),

  http.patch(apiPath("/tasks/:taskId"), async ({ params, request }) => {
    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    const body = await request.json().catch(() => ({}));
    Object.assign(task, body);

    return json(task);
  }),
];
