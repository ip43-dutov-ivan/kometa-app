import { http } from "msw";
import { apiPath } from "../config";
import { json } from "../handlers/utils";

export const emptyStateHandlers = [
  http.get(apiPath("/tasks"), () => json([])),
  http.get(apiPath("/conversations"), () => json([])),
  http.get(apiPath("/matches"), () => json([])),
  http.get(apiPath("/me/responses"), () => json([])),
];
