"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Edit, Flag, MessageSquare, Send, ShieldAlert } from "lucide-react";
import type { Match, Task, User } from "@kometa/logic";
import { getTaskCategoryLabel, getTaskLocationLabel, isTaskOwner } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const { user } = useKometaSession();
  const [task, setTask] = useState<Task | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [submittedResponse, setSubmittedResponse] = useState<string | null>(null);
  const [lastCompletionRequestId, setLastCompletionRequestId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const loadTask = useCallback(async () => {
    setError(null);
    try {
      const [nextTask, matchesResponse, myResponses] = await Promise.all([
        kometaApi.tasks.get(taskId),
        kometaApi.matches.list({ activeOnly: false }).catch(() => ({ items: [] as Match[] })),
        kometaApi.responses.listMine().catch(() => ({ items: [] })),
      ]);
      const nextMatch = matchesResponse.items.find((item) => item.taskId === taskId) ?? null;
      const otherUserId =
        nextMatch && user
          ? nextMatch.ownerId === user.id
            ? nextMatch.providerId
            : nextMatch.ownerId
          : nextTask.ownerId;
      const nextOtherUser = await kometaApi.users.getById(otherUserId).catch(() => null);
      setTask(nextTask);
      setMatch(nextMatch);
      setOtherUser(nextOtherUser);
      setSubmittedResponse(
        myResponses.items.find((response) => response.taskId === taskId)?.status ?? null,
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Task failed to load.");
    } finally {
      setIsLoading(false);
    }
  }, [taskId, user]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  async function respond(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const comment = String(new FormData(form).get("comment") ?? "");
    setIsMutating(true);
    setError(null);
    try {
      await kometaApi.tasks.respond(taskId, { comment });
      form.reset();
      await loadTask();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Response submission failed.");
    } finally {
      setIsMutating(false);
    }
  }

  async function startTask() {
    await mutateTask(() => kometaApi.tasks.start(taskId));
  }

  async function requestCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    setIsMutating(true);
    setError(null);
    try {
      const response = await kometaApi.tasks.requestCompletion(taskId, { note });
      setLastCompletionRequestId(response.completionRequest.id);
      setTask(response.task);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Completion request failed.");
    } finally {
      setIsMutating(false);
    }
  }

  async function confirmCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestId = completionRequestId(event.currentTarget);
    if (!requestId) {
      setError("Completion request id is required by the API contract.");
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await kometaApi.tasks.confirmCompletion(taskId, requestId);
      setTask(response.task);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Completion confirmation failed.",
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
      setError("Completion request id is required by the API contract.");
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await kometaApi.tasks.raiseCompletionConcern(taskId, requestId, {
        reason: String(formData.get("reason") ?? ""),
      });
      setTask(response.task);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Completion concern failed.");
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
      setError(caughtError instanceof Error ? caughtError.message : "Task update failed.");
    } finally {
      setIsMutating(false);
    }
  }

  function completionRequestId(form: HTMLFormElement) {
    return String(new FormData(form).get("requestId") ?? lastCompletionRequestId).trim();
  }

  if (isLoading) {
    return <LoadingState label="Loading task" />;
  }

  if (!task) {
    return error ? <ErrorState message={error} /> : <EmptyState title="Task not found" />;
  }

  const owner = isTaskOwner(task, user?.id);
  const reportHref =
    otherUser && otherUser.id !== user?.id
      ? `/app/reports/new?reportedUserId=${otherUser.id}&taskId=${task.id}`
      : `/app/reports/new?reportedUserId=${task.ownerId}&taskId=${task.id}`;

  return (
    <div className="grid gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/app/tasks">
          <ArrowLeft />
          Back to discovery
        </Link>
      </Button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid gap-4">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{getTaskCategoryLabel(task.category)}</Badge>
              <Badge variant="outline">{task.status}</Badge>
            </div>
            <h1 className="font-heading text-3xl font-semibold">{task.title}</h1>
            <p className="mt-2 text-muted-foreground">{getTaskLocationLabel(task.location)}</p>
          </div>
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-7">{task.description}</p>
            </CardContent>
          </Card>
        </section>
        <aside className="grid h-fit gap-4 rounded-lg border p-5">
          <div>
            <p className="text-sm text-muted-foreground">Compensation</p>
            <p className="font-heading text-2xl font-semibold">
              {task.compensation.amount} {task.compensation.currency}
            </p>
          </div>
          <div className="grid gap-2 text-sm">
            <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
            <span>{owner ? "You own this task" : "Contextual participant actions"}</span>
            {otherUser ? <span>Counterpart: {otherUser.name}</span> : null}
          </div>
          {error ? <ErrorState message={error} /> : null}
          <div className="grid gap-2">
            {renderTaskActions(task, owner)}
            <Button asChild variant="ghost">
              <Link href={reportHref}>
                <ShieldAlert />
                Report
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );

  function renderTaskActions(activeTask: Task, isOwner: boolean) {
    if (activeTask.status === "open") {
      return isOwner ? (
        <>
          <Button asChild variant="outline">
            <Link href={`/app/tasks/${activeTask.id}/edit`}>
              <Edit />
              Edit task
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/app/tasks/${activeTask.id}/responses`}>
              <MessageSquare />
              View responses
            </Link>
          </Button>
        </>
      ) : (
        <form className="grid gap-2" onSubmit={respond}>
          <Textarea name="comment" rows={4} placeholder="How can you help?" required />
          <Button type="submit" disabled={isMutating || Boolean(submittedResponse)}>
            <Send />
            {submittedResponse ? `Response ${submittedResponse}` : "Respond"}
          </Button>
        </form>
      );
    }

    if (activeTask.status === "matched" || activeTask.status === "inProgress") {
      return (
        <>
          {match ? (
            <Button asChild>
              <Link href={`/app/conversations/${match.conversationId}`}>
                <MessageSquare />
                Open chat
              </Link>
            </Button>
          ) : null}
          {activeTask.status === "matched" ? (
            <Button variant="outline" onClick={startTask} disabled={isMutating}>
              <Flag />
              Start task
            </Button>
          ) : null}
          <form className="grid gap-2" onSubmit={requestCompletion}>
            <Textarea name="note" rows={3} placeholder="Completion note" />
            <Button type="submit" variant="outline" disabled={isMutating}>
              <Check />
              Request completion
            </Button>
          </form>
        </>
      );
    }

    if (activeTask.status === "completionRequested") {
      return (
        <>
          <form className="grid gap-2" onSubmit={confirmCompletion}>
            <Input
              name="requestId"
              placeholder="Completion request id"
              defaultValue={lastCompletionRequestId}
            />
            <Button type="submit" disabled={isMutating}>
              <Check />
              Confirm completion
            </Button>
          </form>
          <form className="grid gap-2" onSubmit={raiseConcern}>
            <Input
              name="requestId"
              placeholder="Completion request id"
              defaultValue={lastCompletionRequestId}
            />
            <Textarea name="reason" rows={3} placeholder="Concern reason" required />
            <Button type="submit" variant="outline" disabled={isMutating}>
              Raise concern
            </Button>
          </form>
        </>
      );
    }

    if (activeTask.status === "completed") {
      return (
        <Button asChild>
          <Link href={`/app/tasks/${activeTask.id}/feedback`}>
            <Check />
            Feedback
          </Link>
        </Button>
      );
    }

    return null;
  }
}
