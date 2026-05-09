import { HttpResponse } from "msw";
import { currentUserId, matches, users } from "../data";
import type { ApiError, ListResponse, Match, Task, UserId, UserProfile } from "../types";

export function json<T>(body: T, init?: ResponseInit) {
  return HttpResponse.json(body as never, init);
}

export function listJson<T>(items: T[], init?: ResponseInit) {
  return pagedListJson(items, 20, 0, init);
}

export function pagedListJson<T>(items: T[], limit: number, offset: number, init?: ResponseInit) {
  const pageItems = items.slice(offset, offset + limit);

  return json<ListResponse<T>>(
    {
      items: pageItems,
      pageInfo: {
        limit,
        offset,
        total: items.length,
        hasMore: offset + pageItems.length < items.length,
      },
    },
    init,
  );
}

export function error(
  message: string,
  code = "mock_error",
  status = 400,
  details?: Record<string, unknown>,
) {
  return HttpResponse.json<ApiError>({ code, message, details }, { status });
}

export function drfError(errors: Record<string, string | string[]>, status = 400) {
  return HttpResponse.json(errors, { status });
}

export function getCurrentUser(): UserProfile {
  const user = users.find((item) => item.id === currentUserId);

  if (!user) {
    throw new Error("Mock current user is missing");
  }

  return user;
}

export function requireActiveCurrentUser() {
  const user = getCurrentUser();

  if (user.accountStatus === "blocked") {
    return {
      user,
      response: error("Blocked users cannot perform this action", "account_blocked", 403),
    };
  }

  return { user, response: null };
}

export function getPagination(url: URL, defaultLimit = 20) {
  const limit = clampPositiveInteger(url.searchParams.get("limit"), defaultLimit);
  const offset = clampPositiveInteger(url.searchParams.get("offset"), 0);

  return { limit, offset };
}

export function isTaskParticipant(task: Task, userId: UserId = currentUserId): boolean {
  return task.ownerId === userId || Boolean(getMatchForTask(task.id, userId));
}

export function getMatchForTask(taskId: string, userId?: UserId): Match | undefined {
  return matches.find((match) => {
    if (match.taskId !== taskId) {
      return false;
    }

    if (!userId) {
      return true;
    }

    return match.ownerId === userId || match.providerId === userId;
  });
}

export function getOtherParticipantId(match: Match, userId: UserId = currentUserId): UserId {
  return match.ownerId === userId ? match.providerId : match.ownerId;
}

export function now() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampPositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
