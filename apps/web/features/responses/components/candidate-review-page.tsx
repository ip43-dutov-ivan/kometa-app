"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ShieldAlert, UserRound } from "lucide-react";
import type { Task, TaskResponse, User } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Candidate {
  response: TaskResponse;
  provider?: User;
}

export function CandidateReviewPage({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextTask, responseList] = await Promise.all([
        kometaApi.tasks.get(taskId),
        kometaApi.tasks.listResponses(taskId),
      ]);
      const nextCandidates = await Promise.all(
        responseList.items.map(async (response) => ({
          response,
          provider: await kometaApi.users.getById(response.providerId).catch(() => undefined),
        })),
      );
      setTask(nextTask);
      setCandidates(nextCandidates);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Responses failed to load.");
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  async function acceptResponse(responseId: string) {
    setAcceptingId(responseId);
    setError(null);
    try {
      const match = await kometaApi.tasks.acceptResponse(taskId, responseId);
      window.location.href = `/app/conversations/${match.conversationId}`;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Response acceptance failed.");
    } finally {
      setAcceptingId(null);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading candidates" />;
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Candidate review</h1>
        <p className="mt-2 text-muted-foreground">
          {task ? task.title : "Review submitted task responses."}
        </p>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {candidates.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {candidates.map(({ response, provider }) => (
            <Card key={response.id} className="rounded-lg">
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{response.status}</Badge>
                  {provider ? (
                    <Badge variant="secondary">{provider.rating.toFixed(1)} rating</Badge>
                  ) : null}
                </div>
                <CardTitle className="text-xl">{provider?.name ?? response.providerId}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm leading-6 text-muted-foreground">{response.comment}</p>
                {provider ? (
                  <p className="text-sm">
                    {provider.location} · {provider.completedTasks} completed tasks
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="grid gap-2 sm:grid-cols-3">
                <Button asChild variant="outline">
                  <Link href={`/app/users/${response.providerId}`}>
                    <UserRound />
                    Profile
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link
                    href={`/app/reports/new?reportedUserId=${response.providerId}&taskId=${taskId}`}
                  >
                    <ShieldAlert />
                    Report
                  </Link>
                </Button>
                <Button
                  onClick={() => acceptResponse(response.id)}
                  disabled={
                    task?.status !== "open" ||
                    response.status !== "pending" ||
                    acceptingId === response.id
                  }
                >
                  <Check />
                  {acceptingId === response.id ? "Accepting" : "Accept"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No responses yet" body="New candidate responses will appear here." />
      )}
    </div>
  );
}
