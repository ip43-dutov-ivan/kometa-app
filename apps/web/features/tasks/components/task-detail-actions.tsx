"use client";

import { FormEvent } from "react";
import Link from "next/link";
import { t } from "@kometa/i18n";
import { Check, Copy, Flag, MessageSquare, Send, Trash2 } from "lucide-react";
import type { CompletionRequest, Match, ResponseStatus, Task, User } from "@kometa/logic";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TaskDetailActionsProps {
  task: Task;
  match: Match | null;
  user: User | null | undefined;
  userId: string | undefined;
  isOwner: boolean;
  isMutating: boolean;
  submittedResponse: ResponseStatus | null;
  pendingCompletionRequest: CompletionRequest | null;
  onRespond: (event: FormEvent<HTMLFormElement>) => void;
  onStartTask: () => void;
  onDeleteTask: () => void;
  onRequestCompletion: (event: FormEvent<HTMLFormElement>) => void;
  onConfirmCompletion: (event: FormEvent<HTMLFormElement>) => void;
  onRaiseConcern: (event: FormEvent<HTMLFormElement>) => void;
}

export function TaskDetailActions({
  task,
  match,
  user,
  userId,
  isOwner,
  isMutating,
  submittedResponse,
  pendingCompletionRequest,
  onRespond,
  onStartTask,
  onDeleteTask,
  onRequestCompletion,
  onConfirmCompletion,
  onRaiseConcern,
}: TaskDetailActionsProps) {
  const isProvider = Boolean(userId && match?.providerId === userId);
  const canReviewCompletionRequest = Boolean(
    userId && pendingCompletionRequest && pendingCompletionRequest.requestedByUserId !== userId,
  );

  if (task.status === "open") {
    return isOwner ? (
      <>
        <Button asChild variant="outline">
          <Link href={`/app/tasks/new?duplicateFrom=${encodeURIComponent(task.id)}`}>
            <Copy />
            {t("Duplicate task")}
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/app/tasks/${task.id}/responses`}>
            <MessageSquare />
            {t("View responses")}
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isMutating}>
              <Trash2 />
              {t("Delete task")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete this task?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "This cancels the task and declines pending responses. The task history is kept.",
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={onDeleteTask}>{t("Delete task")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    ) : (
      user && (
        <form className="grid gap-2" onSubmit={onRespond}>
          <Textarea name="comment" rows={4} placeholder={t("How can you help?")} required />
          <Button type="submit" disabled={isMutating || Boolean(submittedResponse)}>
            <Send />
            {submittedResponse ? `${t("Response")} ${t(submittedResponse)}` : t("Respond")}
          </Button>
        </form>
      )
    );
  }

  if (task.status === "matched" || task.status === "inProgress") {
    return (
      <>
        {match ? (
          <Button asChild>
            <Link href={`/app/conversations/${match.conversationId}`}>
              <MessageSquare />
              {t("Open chat")}
            </Link>
          </Button>
        ) : null}
        {task.status === "matched" && isProvider ? (
          <Button variant="outline" onClick={onStartTask} disabled={isMutating}>
            <Flag />
            {t("Start task")}
          </Button>
        ) : null}
        {isProvider ? (
          <form className="grid gap-2" onSubmit={onRequestCompletion}>
            <Textarea name="note" rows={3} placeholder={t("Completion note")} />
            <Button type="submit" variant="outline" disabled={isMutating}>
              <Check />
              {t("Request completion")}
            </Button>
          </form>
        ) : null}
      </>
    );
  }

  if (task.status === "completionRequested" && canReviewCompletionRequest) {
    return (
      <>
        {match ? (
          <Button asChild>
            <Link href={`/app/conversations/${match.conversationId}`}>
              <MessageSquare />
              {t("Open chat")}
            </Link>
          </Button>
        ) : null}
        <form className="grid gap-2" onSubmit={onConfirmCompletion}>
          <input type="hidden" name="requestId" value={pendingCompletionRequest?.id ?? ""} />
          <Button type="submit" disabled={isMutating}>
            <Check />
            {t("Confirm completion")}
          </Button>
        </form>
        <form className="grid gap-2" onSubmit={onRaiseConcern}>
          <input type="hidden" name="requestId" value={pendingCompletionRequest?.id ?? ""} />
          <Textarea name="reason" rows={3} placeholder={t("Concern reason")} required />
          <Button type="submit" variant="outline" disabled={isMutating}>
            {t("Raise concern")}
          </Button>
        </form>
      </>
    );
  }

  if (task.status === "completed") {
    return (
      <Button asChild>
        <Link href={`/app/tasks/${task.id}/feedback`}>
          <Check />
          {t("Feedback")}
        </Link>
      </Button>
    );
  }

  return null;
}
