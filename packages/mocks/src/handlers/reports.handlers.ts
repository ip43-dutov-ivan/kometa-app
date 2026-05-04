import { http } from "msw";
import { apiPath } from "../config";
import { currentUserId, reports, tasks, users } from "../data";
import type { Report, ReportStatus } from "../types";
import {
  createId,
  error,
  getPagination,
  json,
  pagedListJson,
  requireActiveCurrentUser,
  now,
} from "./utils";

export const reportHandlers = [
  http.post(apiPath("/reports"), async ({ request }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Pick<Report, "reportedUserId" | "taskId" | "reason">>;

    if (!input.reportedUserId || !users.some((user) => user.id === input.reportedUserId)) {
      return error("Reported user is required", "reported_user_required", 422);
    }

    if (input.reportedUserId === currentUserId) {
      return error("Users cannot report themselves", "self_report_not_allowed", 422);
    }

    if (input.taskId && !tasks.some((task) => task.id === input.taskId)) {
      return error("Task not found", "task_not_found", 404);
    }

    if (!input.reason?.trim()) {
      return error("Report reason is required", "report_reason_required", 422);
    }

    const report: Report = {
      id: createId("report"),
      reporterId: currentUserId,
      reportedUserId: input.reportedUserId,
      taskId: input.taskId,
      reason: input.reason.trim(),
      status: "open",
      createdAt: now(),
      updatedAt: now(),
    };

    reports.unshift(report);

    return json(report, { status: 201 });
  }),

  http.get(apiPath("/admin/reports"), ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as ReportStatus | null;
    const { limit, offset } = getPagination(url);
    const result = reports.filter((report) => !status || report.status === status);

    return pagedListJson(result, limit, offset);
  }),

  http.patch(apiPath("/admin/reports/:reportId"), async ({ params, request }) => {
    const report = reports.find((item) => item.id === params.reportId);

    if (!report) {
      return error("Report not found", "report_not_found", 404);
    }

    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Pick<Report, "status" | "resolutionNote">>;

    if (input.status && !["open", "reviewing", "resolved", "dismissed"].includes(input.status)) {
      return error("Report status is invalid", "report_status_invalid", 422);
    }

    report.status = input.status ?? report.status;
    report.resolutionNote = input.resolutionNote?.trim() || report.resolutionNote;
    report.updatedAt = now();

    return json(report);
  }),

  http.post(apiPath("/admin/users/:userId/block"), async ({ params, request }) => {
    const user = users.find((item) => item.id === params.userId);

    if (!user) {
      return error("User not found", "user_not_found", 404);
    }

    const body = await request.json().catch(() => ({}));
    const reason = (body as { reason?: string }).reason?.trim();

    if (!reason) {
      return error("Block reason is required", "block_reason_required", 422);
    }

    user.accountStatus = "blocked";
    user.blockedReason = reason;
    user.blockedAt = now();

    return json({
      id: user.id,
      accountStatus: user.accountStatus,
      blockedReason: user.blockedReason,
      blockedAt: user.blockedAt,
    });
  }),

  http.post(apiPath("/admin/users/:userId/unblock"), ({ params }) => {
    const user = users.find((item) => item.id === params.userId);

    if (!user) {
      return error("User not found", "user_not_found", 404);
    }

    user.accountStatus = "active";
    delete user.blockedReason;
    delete user.blockedAt;

    return json({
      id: user.id,
      accountStatus: user.accountStatus,
    });
  }),
];
