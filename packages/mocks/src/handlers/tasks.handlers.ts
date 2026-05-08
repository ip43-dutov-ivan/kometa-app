import { http } from "msw";
import { apiPath } from "../config";
import { completionRequests, currentUserId, responses, tasks } from "../data";
import type { CompletionRequest, Task, TaskLocation, TaskStatus, UserId } from "../types";
import {
  createId,
  error,
  getMatchForTask,
  getPagination,
  getOtherParticipantId,
  isTaskParticipant,
  json,
  pagedListJson,
  requireActiveCurrentUser,
  now,
} from "./utils";

export const taskHandlers = [
  http.get(apiPath("/tasks"), ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as TaskStatus | null;
    const owner = url.searchParams.get("owner");
    const involved = url.searchParams.get("involved");
    const available = url.searchParams.get("available");
    const category = normalizeTaskCategory(url.searchParams.get("category"));
    const location = url.searchParams.get("location")?.toLocaleLowerCase();
    const locationCity = url.searchParams.get("locationCity");
    const { limit, offset } = getPagination(url);

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

      if (available === "true" && (task.ownerId === currentUserId || task.status !== "open")) {
        return false;
      }

      if (category && normalizeTaskCategory(task.category) !== category) {
        return false;
      }

      if (location && !task.location.label.toLocaleLowerCase().includes(location)) {
        return false;
      }

      if (locationCity && getTaskLocationCityId(task) !== locationCity) {
        return false;
      }

      return true;
    });

    return pagedListJson(result, limit, offset);
  }),

  http.get(apiPath("/tasks/location-facets"), ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as TaskStatus | null;
    const available = url.searchParams.get("available");
    const category = normalizeTaskCategory(url.searchParams.get("category"));
    const counts = new Map<string, { id: string; label: string; count: number }>();

    for (const task of tasks) {
      if (status && task.status !== status) {
        continue;
      }

      if (available === "true" && (task.ownerId === currentUserId || task.status !== "open")) {
        continue;
      }

      if (category && normalizeTaskCategory(task.category) !== category) {
        continue;
      }

      const cityId = getTaskLocationCityId(task);
      const cityLabel = getTaskLocationCityLabel(task);
      if (!cityId || !cityLabel) {
        continue;
      }

      const current = counts.get(cityId);
      if (current) {
        current.count += 1;
      } else {
        counts.set(cityId, { id: cityId, label: cityLabel, count: 1 });
      }
    }

    return json(
      [...counts.values()].sort((first, second) => first.label.localeCompare(second.label)),
    );
  }),

  http.post(apiPath("/tasks"), async ({ request }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Task>;
    const locationResult = normalizeTaskLocation(input.location);

    if ("response" in locationResult) {
      return locationResult.response;
    }

    const task: Task = {
      id: createId("task"),
      title: input.title?.trim() || "Untitled task",
      description: input.description?.trim() || "No description provided.",
      category: normalizeTaskCategory(input.category) || "other",
      location: locationResult.location,
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

  http.get(apiPath("/tasks/:taskId/completion-requests"), ({ params }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    if (!isTaskParticipant(task)) {
      return error(
        "Only matched participants can view completion requests",
        "completion_request_forbidden",
        403,
      );
    }

    return json(completionRequests.filter((item) => item.taskId === task.id));
  }),

  http.delete(apiPath("/tasks/:taskId"), ({ params }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    if (task.ownerId !== currentUserId) {
      return error("Only the task owner can delete this task", "task_delete_forbidden", 403);
    }

    if (task.status !== "open") {
      return error("Only open tasks can be deleted", "task_delete_not_allowed", 409);
    }

    const timestamp = now();
    task.status = "cancelled";
    task.updatedAt = timestamp;

    for (const response of responses) {
      if (response.taskId === task.id && response.status === "pending") {
        response.status = "declined";
      }
    }

    return json(task);
  }),

  http.post(apiPath("/tasks/:taskId/start"), ({ params }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    const match = getMatchForTask(task.id, currentUserId);

    if (!match) {
      return error("Only matched participants can start this task", "task_start_forbidden", 403);
    }

    if (match.providerId !== currentUserId) {
      return error(
        "Only the matched provider can start this task",
        "task_start_requester_forbidden",
        403,
      );
    }

    if (task.status !== "matched") {
      return error("Only matched tasks can be started", "task_start_not_allowed", 409);
    }

    task.status = "inProgress";
    task.updatedAt = now();

    return json(task);
  }),

  http.post(apiPath("/tasks/:taskId/completion-requests"), async ({ params, request }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const task = tasks.find((item) => item.id === params.taskId);

    if (!task) {
      return error("Task not found", "task_not_found", 404);
    }

    const match = getMatchForTask(task.id, currentUserId);

    if (!match) {
      return error(
        "Only matched participants can request completion",
        "completion_request_forbidden",
        403,
      );
    }

    if (match.providerId !== currentUserId) {
      return error(
        "Only the matched provider can request completion",
        "completion_request_requester_forbidden",
        403,
      );
    }

    if (task.status !== "matched" && task.status !== "inProgress") {
      return error(
        "Only matched or in-progress tasks can request completion",
        "completion_request_not_allowed",
        409,
      );
    }

    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Pick<CompletionRequest, "note">>;
    const timestamp = now();
    const completionRequest: CompletionRequest = {
      id: createId("completion-request"),
      taskId: task.id,
      requestedByUserId: currentUserId,
      status: "pending",
      note: input.note?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    task.status = "completionRequested";
    task.updatedAt = timestamp;
    completionRequests.unshift(completionRequest);

    return json({ completionRequest, task }, { status: 201 });
  }),

  http.post(apiPath("/tasks/:taskId/completion-requests/:requestId/confirm"), ({ params }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const result = getPendingCompletionRequest(
      String(params.taskId),
      String(params.requestId),
      currentUserId,
    );

    if ("response" in result) {
      return result.response;
    }

    const timestamp = now();
    result.completionRequest.status = "confirmed";
    result.completionRequest.confirmedByUserId = currentUserId;
    result.completionRequest.updatedAt = timestamp;
    result.task.status = "completed";
    result.task.updatedAt = timestamp;

    return json({ completionRequest: result.completionRequest, task: result.task });
  }),

  http.post(
    apiPath("/tasks/:taskId/completion-requests/:requestId/concerns"),
    async ({ params, request }) => {
      const activeUser = requireActiveCurrentUser();
      if (activeUser.response) {
        return activeUser.response;
      }

      const result = getPendingCompletionRequest(
        String(params.taskId),
        String(params.requestId),
        currentUserId,
      );

      if ("response" in result) {
        return result.response;
      }

      const body = await request.json().catch(() => ({}));
      const input = body as Partial<Pick<CompletionRequest, "concernReason">>;
      const reason = input.concernReason?.trim() || (body as { reason?: string }).reason?.trim();

      if (!reason) {
        return error("Concern reason is required", "completion_concern_reason_required", 422);
      }

      const timestamp = now();
      result.completionRequest.status = "concernRaised";
      result.completionRequest.concernReason = reason;
      result.completionRequest.updatedAt = timestamp;
      result.task.status = "inProgress";
      result.task.updatedAt = timestamp;

      return json({ completionRequest: result.completionRequest, task: result.task });
    },
  ),
];

function normalizeTaskCategory(value: string | null | undefined): string {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return "";
  }

  const legacyCategories: Record<string, string> = {
    "design review": "design",
    education: "education",
    errands: "errands",
    general: "other",
    "home tech": "home_tech",
  };

  return legacyCategories[normalizedValue.toLocaleLowerCase()] ?? normalizedValue;
}

function normalizeTaskLocation(value: TaskLocation | undefined) {
  if (!value || typeof value !== "object") {
    return { response: error("Location is required", "location_required", 422) };
  }

  const label = value.label?.trim();
  if (!label) {
    return { response: error("Location label is required", "location_label_required", 422) };
  }

  if (value.isRemote) {
    return {
      location: {
        label,
        isRemote: true,
        cityId: "remote",
        cityLabel: "Remote",
      } satisfies TaskLocation,
    };
  }

  const latitude = value.latitude;
  const longitude = value.longitude;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return {
      response: error(
        "Physical locations require latitude and longitude",
        "location_coordinates_required",
        422,
      ),
    };
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return {
      response: error("Location coordinates are out of range", "location_out_of_range", 422),
    };
  }

  return {
    location: {
      label,
      isRemote: false,
      latitude,
      longitude,
      cityId: value.cityId?.trim() || getLocationCityIdFromLabel(label),
      cityLabel: value.cityLabel?.trim() || getLocationCityLabelFromLabel(label),
      countryCode: value.countryCode?.trim().toUpperCase() || "UA",
    } satisfies TaskLocation,
  };
}

function getTaskLocationCityId(task: Task): string {
  return task.location.cityId || getLocationCityIdFromLabel(task.location.label);
}

function getTaskLocationCityLabel(task: Task): string {
  return task.location.cityLabel || getLocationCityLabelFromLabel(task.location.label);
}

function getLocationCityLabelFromLabel(label: string): string {
  return label.split(",")[0]?.trim() ?? "";
}

function getLocationCityIdFromLabel(label: string): string {
  const cityLabel = getLocationCityLabelFromLabel(label);
  if (!cityLabel) {
    return "";
  }

  if (cityLabel.toLocaleLowerCase() === "remote") {
    return "remote";
  }

  return `ua-${cityLabel
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[-\s]+/g, "-")}`;
}

function getPendingCompletionRequest(taskId: string, requestId: string, currentUser: UserId) {
  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    return { response: error("Task not found", "task_not_found", 404) };
  }

  const match = getMatchForTask(task.id, currentUser);

  if (!match) {
    return {
      response: error(
        "Only matched participants can act on completion requests",
        "completion_request_forbidden",
        403,
      ),
    };
  }

  const completionRequest = completionRequests.find(
    (item) => item.id === requestId && item.taskId === task.id,
  );

  if (!completionRequest) {
    return {
      response: error("Completion request not found", "completion_request_not_found", 404),
    };
  }

  if (completionRequest.status !== "pending" || task.status !== "completionRequested") {
    return {
      response: error(
        "Only pending completion requests can be updated",
        "completion_request_not_pending",
        409,
      ),
    };
  }

  if (completionRequest.requestedByUserId === currentUser) {
    return {
      response: error(
        "The other participant must review this completion request",
        "completion_request_self_review",
        403,
      ),
    };
  }

  if (getOtherParticipantId(match, completionRequest.requestedByUserId) !== currentUser) {
    return {
      response: error(
        "Only the other matched participant can review this completion request",
        "completion_request_reviewer_forbidden",
        403,
      ),
    };
  }

  return { completionRequest, task };
}
