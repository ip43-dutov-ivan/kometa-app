import { http } from "msw";
import { apiPath } from "../config";
import { feedback, users } from "../data";
import type { UserProfile } from "../types";
import {
  error,
  getCurrentUser,
  getPagination,
  json,
  pagedListJson,
  requireActiveCurrentUser,
} from "./utils";

export const profileHandlers = [
  http.get(apiPath("/users/me"), () => {
    return json(getCurrentUser());
  }),

  http.patch(apiPath("/users/me"), async ({ request }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const currentUser = getCurrentUser();
    const body = await request.json().catch(() => ({}));
    const input = body as Partial<
      Pick<UserProfile, "name" | "location" | "bio" | "skills" | "interests" | "avatarUrl">
    >;

    Object.assign(currentUser, {
      name: input.name ?? currentUser.name,
      location: input.location ?? currentUser.location,
      bio: input.bio ?? currentUser.bio,
      skills: input.skills ?? currentUser.skills,
      interests: input.interests ?? currentUser.interests,
      avatarUrl: input.avatarUrl ?? currentUser.avatarUrl,
    });

    return json(currentUser);
  }),

  http.get(apiPath("/users/:userId"), ({ params }) => {
    const user = users.find((item) => item.id === params.userId);

    if (!user) {
      return error("User not found", "user_not_found", 404);
    }

    return json(user);
  }),

  http.get(apiPath("/users/:userId/feedback"), ({ params, request }) => {
    if (!users.some((item) => item.id === params.userId)) {
      return error("User not found", "user_not_found", 404);
    }

    const url = new URL(request.url);
    const { limit, offset } = getPagination(url);

    return pagedListJson(
      feedback.filter((item) => item.receiverId === params.userId),
      limit,
      offset,
    );
  }),
];
