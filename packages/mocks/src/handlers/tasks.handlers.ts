import { http } from "msw";
import { apiPath } from "../config";
import { currentUserId, responses, tasks } from "../data";
import type { Task, TaskStatus } from "../types";
import { createId, error, json, listJson, now } from "./utils";

export const taskHandlers = [
  http.get(apiPath("/tasks"), ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as TaskStatus | null;
    const owner = url.searchParams.get("owner");
    const involved = url.searchParams.get("involved");
    const available = url.searchParams.get("available");
    const category = url.searchParams.get("category")?.toLocaleLowerCase();
    const location = url.searchParams.get("location")?.toLocaleLowerCase();

    const result = tasks.filter((task) => {
      if (status && task.status !== status) {
        return false;
      }

      if (owner === "me" && task.ownerId !== currentUserId) {
        return false;
      }

      if (involved === "me") {
        const isAcceptedProvider = responses.some(
          (response) =>
            response.taskId === task.id &&
            response.providerId === currentUserId &&
            response.status === "accepted",
        );

        if (task.ownerId !== currentUserId && !isAcceptedProvider) {
          return false;
        }
      }

      if (available === "true" && task.ownerId === currentUserId) {
        return false;
      }

      if (category && !task.category.toLocaleLowerCase().includes(category)) {
        return false;
      }

      if (location && !task.location.toLocaleLowerCase().includes(location)) {
        return false;
      }

      return true;
    });

    return listJson(result);
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
      updatedAt: now(),
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

    if (task.ownerId !== currentUserId) {
      return error("Only the task owner can update this task", "task_update_forbidden", 403);
    }

    if (task.status !== "open") {
      return error("Only open tasks can be updated", "task_not_editable", 409);
    }

    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Task>;

    Object.assign(task, {
      title: input.title?.trim() || task.title,
      description: input.description?.trim() || task.description,
      category: input.category?.trim() || task.category,
      location: input.location?.trim() || task.location,
      compensation: input.compensation ?? task.compensation,
      updatedAt: now(),
    });

    return json(task);
  }),
];
