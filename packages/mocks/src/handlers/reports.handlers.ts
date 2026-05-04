import { http } from "msw";
import { apiPath } from "../config";
import { currentUserId, reports, users } from "../data";
import type { Report } from "../types";
import { createId, error, json, now } from "./utils";

export const reportHandlers = [
  http.post(apiPath("/reports"), async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Pick<Report, "reportedUserId" | "taskId" | "reason">>;

    if (!input.reportedUserId || !users.some((user) => user.id === input.reportedUserId)) {
      return error("Reported user is required", "reported_user_required", 422);
    }

    const report: Report = {
      id: createId("report"),
      reporterId: currentUserId,
      reportedUserId: input.reportedUserId,
      taskId: input.taskId,
      reason: input.reason?.trim() || "No reason provided.",
      status: "open",
      createdAt: now(),
      updatedAt: now(),
    };

    reports.unshift(report);

    return json(report, { status: 201 });
  }),
];
