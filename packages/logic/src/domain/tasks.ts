import type { CreateTaskRequest, ListTasksQuery, Task } from "../api/dtos";

export interface TaskFilters {
  category?: string;
  location?: string;
}

export interface TaskFormValues {
  title: string;
  description: string;
  category: string;
  location: string;
  amount: number;
}

export function buildAvailableTasksQuery(filters: TaskFilters = {}): ListTasksQuery {
  return {
    available: true,
    status: "open",
    category: filters.category?.trim() || undefined,
    location: filters.location?.trim() || undefined,
  };
}

export function buildOwnTasksQuery(): ListTasksQuery {
  return { owner: "me" };
}

export function toCreateTaskRequest(values: TaskFormValues): CreateTaskRequest {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category.trim(),
    location: values.location.trim(),
    compensation: {
      type: "money",
      amount: Math.max(0, Number(values.amount) || 0),
      currency: "UAH",
    },
  };
}

export function isTaskOwner(task: Task, currentUserId: string | null | undefined): boolean {
  return Boolean(currentUserId && task.ownerId === currentUserId);
}
