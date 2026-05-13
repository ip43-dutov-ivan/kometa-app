"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { t } from "@kometa/i18n";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import type { CompletionRequest, Match, ResponseStatus, Task, User } from "@kometa/logic";
import { getTaskCategoryLabel, getTaskLocationLabel, isTaskOwner } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskDetailActions } from "./task-detail-actions";

export function TaskDetailPage({
  taskId,
  scope = "discovery",
  returnToConversationId,
}: {
  taskId: string;
  scope?: "discovery" | "owned";
  returnToConversationId?: string;
}) {
  const router = useRouter();
  const { user, hasHydrated } = useKometaSession();
  const userId = user?.id ? String(user.id) : undefined;
  const [task, setTask] = useState<Task | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [submittedResponse, setSubmittedResponse] = useState<ResponseStatus | null>(null);
  const [pendingCompletionRequest, setPendingCompletionRequest] =
    useState<CompletionRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const loadTask = useCallback(async () => {
    if (!hasHydrated) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [nextTask, matchesResponse, myResponses] = await Promise.all([
        kometaApi.tasks.get(taskId),
        kometaApi.matches.list({ activeOnly: false }).catch(() => ({ items: [] as Match[] })),
        kometaApi.responses.listMine().catch(() => ({ items: [] })),
      ]);
      const nextMatch = matchesResponse.items.find((item) => item.taskId === taskId) ?? null;
      const completionRequests = nextMatch
        ? await kometaApi.tasks.listCompletionRequests(taskId).catch(() => [])
        : [];
      const otherUserId =
        nextMatch && userId
          ? nextMatch.ownerId === userId
            ? nextMatch.providerId
            : nextMatch.ownerId
          : nextTask.ownerId === userId
            ? null
            : nextTask.ownerId;
      const nextOtherUser = otherUserId
        ? await kometaApi.users.getById(otherUserId).catch(() => null)
        : null;
      setTask(nextTask);
      setMatch(nextMatch);
      setOtherUser(nextOtherUser);
      setSubmittedResponse(
        myResponses.items.find((response) => response.taskId === taskId)?.status ?? null,
      );
      setPendingCompletionRequest(
        completionRequests.find((request) => request.status === "pending") ?? null,
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("Task failed to load."));
    } finally {
      setIsLoading(false);
    }
  }, [hasHydrated, taskId, userId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (!task || !userId) {
      return;
    }

    const owner = isTaskOwner(task, userId);
    if (scope === "discovery" && owner) {
      router.replace(`/app/my-tasks/${task.id}`);
    }
    if (scope === "owned" && !owner) {
      router.replace(`/app/tasks/${task.id}`);
    }
  }, [router, scope, task, userId]);

  async function respond(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const comment = String(new FormData(form).get("comment") ?? "");
    const previousSubmittedResponse = submittedResponse;
    setIsMutating(true);
    setError(null);
    setSubmittedResponse("pending");
    try {
      await kometaApi.tasks.respond(taskId, { comment });
      form.reset();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : t("Response submission failed.");
      setSubmittedResponse(previousSubmittedResponse);
      setError(message);
      toast.error(message);
    } finally {
      setIsMutating(false);
    }
  }

  async function startTask() {
    await mutateTask(() => kometaApi.tasks.start(taskId));
  }

  async function cancelTask() {
    setIsMutating(true);
    setError(null);
    try {
      await kometaApi.tasks.delete(taskId);
      router.push("/app/my-tasks");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("Task deletion failed."));
    } finally {
      setIsMutating(false);
    }
  }

  async function requestCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    setIsMutating(true);
    setError(null);
    try {
      const response = await kometaApi.tasks.requestCompletion(taskId, { note });
      setPendingCompletionRequest(response.completionRequest);
      setTask(response.task);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : t("Completion request failed."),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function confirmCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestId = completionRequestId(event.currentTarget);
    if (!requestId) {
      setError(t("Completion request id is required by the API contract."));
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await kometaApi.tasks.confirmCompletion(taskId, requestId);
      setPendingCompletionRequest(response.completionRequest);
      setTask(response.task);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : t("Completion confirmation failed."),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function raiseConcern(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const requestId = completionRequestId(event.currentTarget);
    if (!requestId) {
      setError(t("Completion request id is required by the API contract."));
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await kometaApi.tasks.raiseCompletionConcern(taskId, requestId, {
        reason: String(formData.get("reason") ?? ""),
      });
      setPendingCompletionRequest(response.completionRequest);
      setTask(response.task);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : t("Completion concern failed."),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function mutateTask(mutation: () => Promise<Task>) {
    setIsMutating(true);
    setError(null);
    try {
      setTask(await mutation());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("Task update failed."));
    } finally {
      setIsMutating(false);
    }
  }

  function completionRequestId(form: HTMLFormElement) {
    return String(new FormData(form).get("requestId") ?? pendingCompletionRequest?.id ?? "").trim();
  }

  if (!hasHydrated || isLoading) {
    return <LoadingState label={t("Loading task")} />;
  }

  if (!task) {
    return error ? <ErrorState message={error} /> : <EmptyState title={t("Task not found")} />;
  }

  const owner = isTaskOwner(task, user?.id);
  const reportedUserId =
    otherUser && otherUser.id !== userId
      ? otherUser.id
      : !owner && task.ownerId !== userId
        ? task.ownerId
        : null;
  const reportHref = reportedUserId
    ? `/app/reports/new?reportedUserId=${reportedUserId}&taskId=${task.id}`
    : null;
  const chatBackHref =
    returnToConversationId && match?.conversationId === returnToConversationId
      ? `/app/conversations/${encodeURIComponent(returnToConversationId)}`
      : null;
  const backHref = chatBackHref ?? (scope === "owned" ? "/app/my-tasks" : "/app/tasks");
  const backLabel = chatBackHref
    ? t("Back to chat")
    : scope === "owned"
      ? t("Back to my tasks")
      : t("Back to discovery");

  return (
    <div className="grid gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href={backHref}>
          <ArrowLeft />
          {backLabel}
        </Link>
      </Button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid gap-4">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{getTaskCategoryLabel(task.category)}</Badge>
              <Badge variant="outline">{t(task.status)}</Badge>
            </div>
            <h1 className="font-heading text-3xl font-semibold">{task.title}</h1>
            <p className="mt-2 text-muted-foreground">{getTaskLocationLabel(task.location)}</p>
          </div>
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>{t("Description")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-7">{task.description}</p>
            </CardContent>
          </Card>
        </section>
        <aside className="grid h-fit gap-4 rounded-lg border p-5">
          <div>
            <p className="text-sm text-muted-foreground">{t("Compensation")}</p>
            <p className="font-heading text-2xl font-semibold">
              {task.compensation.amount} {t("credits")}
            </p>
          </div>
          <div className="grid gap-2 text-sm">
            <span>
              {t("Created")} {new Date(task.createdAt).toLocaleDateString()}
            </span>
            <span>{owner ? t("You own this task") : t("Contextual participant actions")}</span>
            {otherUser ? (
              <span>
                {t("Counterpart")}: {otherUser.name}
              </span>
            ) : null}
          </div>
          {error ? <ErrorState message={error} /> : null}
          <div className="grid gap-2">
            <TaskDetailActions
              task={task}
              match={match}
              user={user}
              userId={userId}
              isOwner={owner}
              isMutating={isMutating}
              submittedResponse={submittedResponse}
              pendingCompletionRequest={pendingCompletionRequest}
              onRespond={respond}
              onStartTask={startTask}
              onDeleteTask={cancelTask}
              onRequestCompletion={requestCompletion}
              onConfirmCompletion={confirmCompletion}
              onRaiseConcern={raiseConcern}
            />
            {reportHref ? (
              <Button asChild variant="ghost">
                <Link href={reportHref}>
                  <ShieldAlert />
                  {t("Report")}
                </Link>
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
