"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Save, Star } from "lucide-react";
import type { Feedback, Task } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function TaskFeedbackPage({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFeedback = useCallback(async () => {
    setError(null);
    try {
      const [nextTask, nextFeedback] = await Promise.all([
        kometaApi.tasks.get(taskId),
        kometaApi.tasks.listFeedback(taskId),
      ]);
      setTask(nextTask);
      setFeedback(nextFeedback);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Feedback failed to load.");
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  async function leaveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    setError(null);
    try {
      await kometaApi.tasks.leaveFeedback(taskId, {
        rating: Number(formData.get("rating") ?? 5),
        comment: String(formData.get("comment") ?? ""),
      });
      form.reset();
      await loadFeedback();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Feedback submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading feedback" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="grid gap-5">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Task feedback</h1>
          <p className="mt-2 text-muted-foreground">{task?.title ?? taskId}</p>
        </div>
        {error ? <ErrorState message={error} /> : null}
        {feedback.length ? (
          <div className="grid gap-4">
            {feedback.map((item) => (
              <Card key={item.id} className="rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="size-4 text-primary" />
                    {item.rating}/5
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{item.comment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No feedback yet" body="Feedback appears after completion." />
        )}
      </section>
      <aside className="h-fit rounded-lg border p-5">
        <form className="grid gap-4" onSubmit={leaveFeedback}>
          <div>
            <h2 className="font-heading text-xl font-semibold">Leave feedback</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Available once the task is completed.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rating">Rating</Label>
            <Input id="rating" name="rating" type="number" min={1} max={5} defaultValue={5} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea id="comment" name="comment" rows={5} required />
          </div>
          <Button type="submit" disabled={isSubmitting || task?.status !== "completed"}>
            <Save />
            {isSubmitting ? "Saving" : "Submit feedback"}
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/app/tasks/${taskId}`}>Back to task</Link>
          </Button>
        </form>
      </aside>
    </div>
  );
}
