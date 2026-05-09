"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, ShieldAlert } from "lucide-react";
import { t } from "@kometa/i18n";
import type { Match, Task, User } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface MatchItem {
  match: Match;
  task?: Task;
  otherUser?: User;
}

export function MatchesPage() {
  const { user } = useKometaSession();
  const [items, setItems] = useState<MatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadMatches() {
      try {
        const response = await kometaApi.matches.list({ activeOnly: true });
        const nextItems = await Promise.all(
          response.items.map(async (match) => {
            const otherUserId =
              match.ownerId === (user?.id ? String(user.id) : undefined)
                ? match.providerId
                : match.ownerId;
            const [task, otherUser] = await Promise.all([
              kometaApi.tasks.get(match.taskId).catch(() => undefined),
              kometaApi.users.getById(otherUserId).catch(() => undefined),
            ]);
            return { match, task, otherUser };
          }),
        );
        if (isActive) {
          setItems(nextItems);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error ? caughtError.message : t("Matches failed to load."),
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    if (user) {
      loadMatches();
    }
    return () => {
      isActive = false;
    };
  }, [user]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">{t("Matches")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("Active task interactions that can use chat.")}
        </p>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {isLoading ? (
        <LoadingState label={t("Loading matches")} />
      ) : items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(({ match, task, otherUser }) => (
            <Card key={match.id} className="rounded-lg">
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  {task ? <Badge variant="outline">{t(task.status)}</Badge> : null}
                  {otherUser ? <Badge variant="secondary">{otherUser.name}</Badge> : null}
                </div>
                <CardTitle className="text-xl">{task?.title ?? match.taskId}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("Matched")} {new Date(match.createdAt).toLocaleDateString()}
              </CardContent>
              <CardFooter className="grid gap-2 sm:grid-cols-3">
                <Button asChild variant="outline">
                  <Link href={`/app/tasks/${match.taskId}`}>{t("Task")}</Link>
                </Button>
                <Button asChild>
                  <Link href={`/app/conversations/${match.conversationId}`}>
                    <MessageSquare />
                    {t("Chat")}
                  </Link>
                </Button>
                {otherUser ? (
                  <Button asChild variant="ghost">
                    <Link
                      href={`/app/reports/new?reportedUserId=${otherUser.id}&taskId=${match.taskId}`}
                    >
                      <ShieldAlert />
                      {t("Report")}
                    </Link>
                  </Button>
                ) : null}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("No active matches")}
          body={t("Accept a response or get accepted first.")}
        />
      )}
    </div>
  );
}
