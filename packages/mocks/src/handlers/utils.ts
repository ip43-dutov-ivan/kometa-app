import { HttpResponse } from "msw";
import { currentUserId, users } from "../data";
import type { ApiError, ListResponse, UserProfile } from "../types";

export function json<T>(body: T, init?: ResponseInit) {
  return HttpResponse.json(body as never, init);
}

export function listJson<T>(items: T[], init?: ResponseInit) {
  return json<ListResponse<T>>(
    {
      items,
      pageInfo: {
        limit: items.length,
        offset: 0,
        total: items.length,
        hasMore: false,
      },
    },
    init,
  );
}

export function error(message: string, code = "mock_error", status = 400) {
  return HttpResponse.json<ApiError>({ message, code }, { status });
}

export function getCurrentUser(): UserProfile {
  const user = users.find((item) => item.id === currentUserId);

  if (!user) {
    throw new Error("Mock current user is missing");
  }

  return user;
}

export function now() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
