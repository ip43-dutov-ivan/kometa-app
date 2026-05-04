export const API_BASE_PATH = "*/api";

export function apiPath(path: string) {
  return `${API_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
