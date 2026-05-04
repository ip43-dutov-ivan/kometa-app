export const API_BASE_PATH = "*/api/v1";

export function apiPath(path: string) {
  return `${API_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
