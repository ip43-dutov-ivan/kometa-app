"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { t } from "@kometa/i18n";
import type { Task, TaskResponse } from "@kometa/logic";
import { getTaskLocationLabel } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ResponseItem {
  response: TaskResponse;
  task?: Task;
}

export function MyResponsesPage() {
  const [items, setItems] = useState<ResponseItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadResponses() {
      try {
        const response = await kometaApi.responses.listMine();
        const taskPairs = await Promise.all(
          response.items.map(async (item) => ({
            response: item,
            task: await kometaApi.tasks.get(item.taskId).catch(() => undefined),
          })),
        );
        if (isActive) {
          setItems(taskPairs);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : t("Your responses failed to load."),
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadResponses();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">{t("My responses")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("Track offers you submitted to open tasks.")}
        </p>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {isLoading ? (
        <LoadingState label={t("Loading responses")} />
      ) : items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(({ response, task }) => (
            <Card key={response.id} className="rounded-lg">
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{t(response.status)}</Badge>
                  {task ? <Badge variant="secondary">{t(task.status)}</Badge> : null}
                </div>
                <CardTitle className="text-xl">{task?.title ?? response.taskId}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <p className="leading-6 text-muted-foreground">{response.comment}</p>
                {task ? (
                  <p>
                    {getTaskLocationLabel(task.location)} · {task.compensation.amount}{" "}
                    {t("credits")}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/app/tasks/${response.taskId}`}>
                    <ExternalLink />
                    {t("Open task")}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("No responses yet")}
          body={t("Respond to a task from discovery first.")}
        />
      )}
    </div>
  );
}
