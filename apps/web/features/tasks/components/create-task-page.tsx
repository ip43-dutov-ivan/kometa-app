"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { TaskLocation } from "@kometa/logic";
import { normalizeTaskCategoryId, toCreateTaskRequest } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { ErrorState, LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaskCategorySelect } from "./task-category-select";
import { TaskLocationPicker } from "./task-location-picker";

const EMPTY_TASK_LOCATION: TaskLocation = {
  label: "Remote",
  isRemote: true,
};

export function CreateTaskPage({ duplicateFrom }: { duplicateFrom?: string }) {
  const router = useRouter();
  const { user, hasHydrated } = useKometaSession();
  const userId = user?.id ? String(user.id) : undefined;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState<TaskLocation>(EMPTY_TASK_LOCATION);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDuplicate, setIsLoadingDuplicate] = useState(Boolean(duplicateFrom));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!duplicateFrom) {
      setIsLoadingDuplicate(false);
      return;
    }

    if (!hasHydrated) {
      return;
    }

    let isActive = true;
    const sourceTaskId = duplicateFrom;

    async function loadSourceTask() {
      setIsLoadingDuplicate(true);
      setError(null);
      try {
        const sourceTask = await kometaApi.tasks.get(sourceTaskId);

        if (!isActive) {
          return;
        }

        if (!userId || sourceTask.ownerId !== userId) {
          setError("Only the task owner can duplicate this task.");
          return;
        }

        setTitle(sourceTask.title);
        setDescription(sourceTask.description);
        setCategory(normalizeTaskCategoryId(sourceTask.category));
        setLocation(sourceTask.location);
        setAmount(String(sourceTask.compensation.amount));
      } catch (caughtError) {
        if (isActive) {
          setError(caughtError instanceof Error ? caughtError.message : "Task failed to load.");
        }
      } finally {
        if (isActive) {
          setIsLoadingDuplicate(false);
        }
      }
    }

    loadSourceTask();

    return () => {
      isActive = false;
    };
  }, [duplicateFrom, hasHydrated, userId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!category) {
      setError("Select a category before creating the task.");
      return;
    }

    if (!isTaskLocationComplete(location)) {
      setError("Select a map location or mark the task as remote.");
      return;
    }

    setIsSubmitting(true);

    const request = toCreateTaskRequest({
      title,
      description,
      category,
      location,
      amount: Number(amount),
    });

    try {
      const task = await kometaApi.tasks.create(request);
      router.push(`/app/my-tasks/${task.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Task creation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingDuplicate) {
    return <LoadingState label="Loading task" />;
  }

  const isDuplicate = Boolean(duplicateFrom);

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">
          {isDuplicate ? "Duplicate task" : "Create task"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isDuplicate
            ? "Review the copied details and publish a new task."
            : "Describe the help you need and set compensation."}
        </p>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Task details</CardTitle>
          <CardDescription>Open tasks can be discovered by other users.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            {error ? <ErrorState message={error} /> : null}
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Category</Label>
                <TaskCategorySelect name="category" value={category} onValueChange={setCategory} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Compensation, UAH</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <TaskLocationPicker value={location} onChange={setLocation} disabled={isSubmitting} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <Plus />
              {isSubmitting ? "Creating" : "Create task"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function isTaskLocationComplete(location: TaskLocation): boolean {
  if (!location.label.trim()) {
    return false;
  }

  return (
    location.isRemote ||
    (location.latitude !== undefined &&
      location.longitude !== undefined &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude))
  );
}
