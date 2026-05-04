"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { Task } from "@kometa/logic";
import { toCreateTaskRequest } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { ErrorState, LoadingState } from "@/shared/components/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EditTaskPage({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;
    async function loadTask() {
      try {
        const nextTask = await kometaApi.tasks.get(taskId);
        if (isActive) {
          setTask(nextTask);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(caughtError instanceof Error ? caughtError.message : "Task failed to load.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }
    loadTask();
    return () => {
      isActive = false;
    };
  }, [taskId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const request = toCreateTaskRequest({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: String(formData.get("category") ?? ""),
      location: String(formData.get("location") ?? ""),
      amount: Number(formData.get("amount") ?? 0),
    });

    try {
      const nextTask = await kometaApi.tasks.update(taskId, request);
      router.push(`/app/tasks/${nextTask.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Task update failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading task" />;
  }

  if (!task) {
    return <ErrorState message={error ?? "Task is unavailable."} />;
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Edit task</h1>
        <p className="mt-2 text-muted-foreground">
          Open task details can be adjusted before matching.
        </p>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Task details</CardTitle>
          <CardDescription>Changes update the same task record.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            {error ? <ErrorState message={error} /> : null}
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={task.title} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={task.description}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" defaultValue={task.category} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" defaultValue={task.location} required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Compensation, UAH</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="1"
                defaultValue={task.compensation.amount}
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <Save />
              {isSubmitting ? "Saving" : "Save task"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
