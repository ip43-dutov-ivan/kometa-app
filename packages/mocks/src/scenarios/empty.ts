import { http } from "msw";
import { apiPath } from "../config";
import { listJson } from "../handlers/utils";

export const emptyStateHandlers = [
  http.get(apiPath("/tasks"), () => listJson([])),
  http.get(apiPath("/conversations"), () => listJson([])),
  http.get(apiPath("/matches"), () => listJson([])),
  http.get(apiPath("/me/responses"), () => listJson([])),
];
