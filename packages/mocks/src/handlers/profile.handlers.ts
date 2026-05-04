import { http } from "msw";
import { apiPath } from "../config";
import { feedback, users } from "../data";
import type { UserProfile } from "../types";
import { error, getCurrentUser, json } from "./utils";

export const profileHandlers = [
  http.get(apiPath("/users/me"), () => {
    return json(getCurrentUser());
  }),

  http.patch(apiPath("/users/me"), async ({ request }) => {
    const currentUser = getCurrentUser();
    const body = await request.json().catch(() => ({}));
    const input = body as Partial<
      Pick<UserProfile, "name" | "location" | "bio" | "skills" | "interests">
    >;

    Object.assign(currentUser, {
      name: input.name ?? currentUser.name,
      location: input.location ?? currentUser.location,
      bio: input.bio ?? currentUser.bio,
      skills: input.skills ?? currentUser.skills,
      interests: input.interests ?? currentUser.interests,
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

  http.get(apiPath("/users/:userId/feedback"), ({ params }) => {
    return json(feedback.filter((item) => item.receiverId === params.userId));
  }),
];
