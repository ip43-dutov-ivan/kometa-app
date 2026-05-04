import { authHandlers } from "./auth.handlers";
import { chatHandlers } from "./chat.handlers";
import { feedbackHandlers } from "./feedback.handlers";
import { matchHandlers } from "./matches.handlers";
import { profileHandlers } from "./profile.handlers";
import { reportHandlers } from "./reports.handlers";
import { responseHandlers } from "./responses.handlers";
import { taskHandlers } from "./tasks.handlers";

export const handlers = [
  ...authHandlers,
  ...profileHandlers,
  ...taskHandlers,
  ...responseHandlers,
  ...matchHandlers,
  ...chatHandlers,
  ...feedbackHandlers,
  ...reportHandlers,
];

export {
  authHandlers,
  chatHandlers,
  feedbackHandlers,
  matchHandlers,
  profileHandlers,
  reportHandlers,
  responseHandlers,
  taskHandlers,
};
