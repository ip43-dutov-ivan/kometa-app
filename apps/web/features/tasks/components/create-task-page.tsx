"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toCreateTaskRequest } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { ErrorState } from "@/shared/components/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaskCategorySelect } from "./task-category-select";

export function CreateTaskPage() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!category) {
      setError("Select a category before creating the task.");
      return;
    }

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
      const task = await kometaApi.tasks.create(request);
      router.push(`/app/tasks/${task.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Task creation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Create task</h1>
        <p className="mt-2 text-muted-foreground">
          Describe the help you need and set compensation.
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
              <Input id="title" name="title" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={5} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Category</Label>
                <TaskCategorySelect name="category" value={category} onValueChange={setCategory} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Compensation, UAH</Label>
              <Input id="amount" name="amount" type="number" min="0" step="1" required />
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
