import { http } from "msw";
import { apiPath } from "../config";
import { drfError } from "../handlers/utils";

export const authValidationErrorHandlers = [
  http.post(apiPath("/auth/login"), () =>
    drfError({
      non_field_errors: ["Unable to log in with provided credentials."],
    }),
  ),
  http.post(apiPath("/auth/register"), () =>
    drfError({
      email: ["A user with that email already exists."],
    }),
  ),
];
