"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { ErrorState, LoadingState } from "@/shared/components/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdminUserModerationPage({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    kometaApi.users
      .getById(userId)
      .then(setUser)
      .catch((caughtError) =>
        setError(caughtError instanceof Error ? caughtError.message : "User failed to load."),
      )
      .finally(() => setIsLoading(false));
  }, [userId]);

  async function blockUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "");
    try {
      await kometaApi.admin.blockUser(userId, { reason });
      setUser(await kometaApi.users.getById(userId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Block failed.");
    }
  }

  async function unblockUser() {
    try {
      await kometaApi.admin.unblockUser(userId);
      setUser(await kometaApi.users.getById(userId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unblock failed.");
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading user" />;
  }

  if (!user) {
    return <ErrorState message={error ?? "User is unavailable."} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section>
        <h1 className="font-heading text-3xl font-semibold">User moderation</h1>
        {error ? <ErrorState message={error} /> : null}
        <Card className="mt-5 rounded-lg">
          <CardHeader>
            <Badge className="w-fit" variant="outline">
              {user.accountStatus}
            </Badge>
            <CardTitle>{user.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <span>{user.location}</span>
            <p className="leading-6 text-muted-foreground">{user.bio}</p>
            <span>{user.rating.toFixed(1)} rating</span>
          </CardContent>
        </Card>
      </section>
      <aside className="h-fit rounded-lg border p-5">
        <form className="grid gap-4" onSubmit={blockUser}>
          <div className="grid gap-2">
            <Label htmlFor="reason">Block reason</Label>
            <Textarea id="reason" name="reason" rows={5} required />
          </div>
          <Button type="submit" variant="destructive">
            Block user
          </Button>
          <Button type="button" variant="outline" onClick={unblockUser}>
            Unblock user
          </Button>
        </form>
      </aside>
    </div>
  );
}
