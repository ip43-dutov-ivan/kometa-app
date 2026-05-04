"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import type { Task, User } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { ErrorState } from "@/shared/components/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportedUserId = searchParams.get("reportedUserId") ?? "";
  const taskId = searchParams.get("taskId") ?? undefined;
  const [reportedUser, setReportedUser] = useState<User | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (reportedUserId) {
      kometaApi.users
        .getById(reportedUserId)
        .then(setReportedUser)
        .catch(() => setReportedUser(null));
    }
    if (taskId) {
      kometaApi.tasks
        .get(taskId)
        .then(setTask)
        .catch(() => setTask(null));
    }
  }, [reportedUserId, taskId]);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setIsSubmitting(true);
    try {
      await kometaApi.reports.create({
        reportedUserId,
        taskId,
        reason: String(formData.get("reason") ?? ""),
      });
      router.push(taskId ? `/app/tasks/${taskId}` : `/app/users/${reportedUserId}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Report submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Create report</h1>
        <p className="mt-2 text-muted-foreground">Report unsafe or problematic behavior.</p>
      </div>
      {error ? <ErrorState message={error} /> : null}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert />
            Report summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1 text-sm">
            <span>Reported user: {reportedUser?.name ?? (reportedUserId || "Missing")}</span>
            {taskId ? <span>Task: {task?.title ?? taskId}</span> : null}
          </div>
          <form className="grid gap-4" onSubmit={submitReport}>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" name="reason" rows={6} required />
            </div>
            <Button type="submit" disabled={isSubmitting || !reportedUserId}>
              <ShieldAlert />
              {isSubmitting ? "Submitting" : "Submit report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
