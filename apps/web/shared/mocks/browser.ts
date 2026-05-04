import { handlers } from "@kometa/mocks";
import { setupWorker } from "msw/browser";

export const worker = setupWorker(...handlers);
