"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, MessageSquare, ShieldAlert } from "lucide-react";
import type { Task } from "@kometa/logic";
import { isTaskOwner } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const { user } = useKometaSession();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return <LoadingState label="Loading task" />;
  }

  if (!task) {
    return error ? <ErrorState message={error} /> : <EmptyState title="Task not found" />;
  }

  const owner = isTaskOwner(task, user?.id);

  return (
    <div className="grid gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/app/tasks">
          <ArrowLeft />
          Back to discovery
        </Link>
      </Button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="grid gap-4">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{task.category}</Badge>
              <Badge variant="outline">{task.status}</Badge>
            </div>
            <h1 className="font-heading text-3xl font-semibold">{task.title}</h1>
            <p className="mt-2 text-muted-foreground">{task.location}</p>
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
            <span>{owner ? "You own this task" : "Open for your response"}</span>
          </div>
          <div className="grid gap-2">
            {owner ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/app/tasks/${task.id}/edit`}>
                    <Edit />
                    Edit task
                  </Link>
                </Button>
                <Button variant="outline" disabled title="Candidate review is planned next">
                  <MessageSquare />
                  View responses
                </Button>
              </>
            ) : (
              <Button disabled title="Response flow is planned next">
                <MessageSquare />
                Respond
              </Button>
            )}
            <Button
              variant="ghost"
              disabled
              title="Reports are planned in a later implementation step"
            >
              <ShieldAlert />
              Report
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
