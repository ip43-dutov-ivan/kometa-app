import { http } from "msw";
import { apiPath } from "../config";
import { users } from "../data";
import type { AuthSession, UserProfile } from "../types";
import { createId, getCurrentUser, json } from "./utils";

export const authHandlers = [
  http.post(apiPath("/auth/login"), async () => {
    return json<AuthSession>({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      user: getCurrentUser(),
    });
  }),

  http.post(apiPath("/auth/register"), async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Pick<UserProfile, "name" | "location" | "bio">>;

    const user: UserProfile = {
      id: createId("user"),
      name: input.name?.trim() || "New Kometa User",
      location: input.location?.trim() || "Kyiv",
      bio: input.bio?.trim() || "New user exploring local micro-tasks.",
      skills: [],
      interests: [],
      rating: 0,
      completedTasks: 0,
      accountStatus: "active",
      avatarUrl: "/placeholder-user.jpg",
      creditBalance: 100,
      creditReserved: 0,
    };

    users.push(user);

    return json<AuthSession>(
      {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user,
      },
      { status: 201 },
    );
  }),

  http.post(apiPath("/auth/refresh"), async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };

    if (!body.refreshToken) {
      return json({ refreshToken: ["This field is required."] }, { status: 400 });
    }

    return json({ accessToken: "mock-access-token" });
  }),

  http.post(apiPath("/auth/logout"), () => {
    return new Response(null, { status: 204 });
  }),
];
