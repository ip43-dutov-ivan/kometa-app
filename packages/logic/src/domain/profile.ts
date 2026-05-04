import type { UpdateCurrentUserRequest } from "../api/dtos";

export interface ProfileFormValues {
  name: string;
  location: string;
  bio: string;
  skills: string;
  interests: string;
  avatarUrl?: string;
}

export function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toUpdateCurrentUserRequest(values: ProfileFormValues): UpdateCurrentUserRequest {
  return {
    name: values.name.trim(),
    location: values.location.trim(),
    bio: values.bio.trim(),
    skills: parseCommaSeparatedList(values.skills),
    interests: parseCommaSeparatedList(values.interests),
    avatarUrl: values.avatarUrl?.trim() || undefined,
  };
}
