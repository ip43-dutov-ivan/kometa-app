import { http } from "msw";
import { apiPath } from "../config";
import { users } from "../data";
import type { AuthSession, UserProfile } from "../types";
import { createId, getCurrentUser, json } from "./utils";

export const authHandlers = [
  http.post(apiPath("/auth/login"), async () => {
    return json<AuthSession>({
      token: "mock-access-token",
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
      avatarUrl: "/placeholder-user.jpg",
    };

    users.push(user);

    return json<AuthSession>(
      {
        token: "mock-access-token",
        user,
      },
      { status: 201 },
    );
  }),

  http.post(apiPath("/auth/logout"), () => {
    return new Response(null, { status: 204 });
  }),
];
