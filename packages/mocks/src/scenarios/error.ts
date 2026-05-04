import { http } from "msw";
import { apiPath } from "../config";
import { error } from "../handlers/utils";

export const serverErrorHandlers = [
  http.get(apiPath("/tasks"), () => error("Mock server error", "mock_server_error", 500)),
  http.get(apiPath("/users/me"), () => error("Mock session expired", "mock_session_expired", 401)),
];
