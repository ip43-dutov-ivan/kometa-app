"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Save, ShieldAlert, Star } from "lucide-react";
import { t } from "@kometa/i18n";
import { toUpdateCurrentUserRequest } from "@kometa/logic";
import type { User } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { ErrorState, LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfilePage() {
  const { user, setUser } = useKometaSession();
  const [profile, setProfile] = useState<User | null>(user);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        const nextProfile = await kometaApi.users.getMe();
        if (isActive) {
          setProfile(nextProfile);
          setUser(nextProfile);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error ? caughtError.message : t("Profile failed to load."),
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      isActive = false;
    };
  }, [setUser]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const request = toUpdateCurrentUserRequest({
      name: String(formData.get("name") ?? ""),
      location: String(formData.get("location") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      skills: String(formData.get("skills") ?? ""),
      interests: String(formData.get("interests") ?? ""),
      avatarUrl: String(formData.get("avatarUrl") ?? ""),
    });

    try {
      const nextProfile = await kometaApi.users.updateMe(request);
      setProfile(nextProfile);
      setUser(nextProfile);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("Profile update failed."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading && !profile) {
    return <LoadingState label={t("Loading profile")} />;
  }

  if (!profile) {
    return <ErrorState message={error ?? t("Profile is unavailable.")} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <div className="mb-5">
          <h1 className="font-heading text-3xl font-semibold">{t("Profile")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("Keep your public profile accurate for task owners and responders.")}
          </p>
        </div>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{t("Edit profile")}</CardTitle>
            <CardDescription>{t("Skills and interests are comma-separated.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onSubmit}>
              {error ? <ErrorState message={error} /> : null}
              <div className="grid gap-2">
                <Label htmlFor="name">{t("Name")}</Label>
                <Input id="name" name="name" defaultValue={profile.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">{t("Location")}</Label>
                <Input id="location" name="location" defaultValue={profile.location} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">{t("Bio")}</Label>
                <Textarea id="bio" name="bio" rows={5} defaultValue={profile.bio} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="skills">{t("Skills")}</Label>
                <Input id="skills" name="skills" defaultValue={profile.skills.join(", ")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="interests">{t("Interests")}</Label>
                <Input
                  id="interests"
                  name="interests"
                  defaultValue={profile.interests.join(", ")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avatarUrl">{t("Avatar URL")}</Label>
                <Input id="avatarUrl" name="avatarUrl" defaultValue={profile.avatarUrl ?? ""} />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                <Save />
                {isSubmitting ? t("Saving") : t("Save profile")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
      <aside className="grid h-fit gap-4 rounded-lg border p-5">
        <div>
          <p className="text-sm text-muted-foreground">{t("Public preview")}</p>
          <h2 className="mt-1 font-heading text-2xl font-semibold">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">{profile.location}</p>
        </div>
        <p className="text-sm leading-6">{profile.bio}</p>
        <div className="flex items-center gap-2 text-sm">
          <Star className="size-4 text-primary" />
          {profile.rating.toFixed(1)} {t("rating")}
          <span className="text-muted-foreground">
            ({profile.completedTasks} {t("completed")})
          </span>
        </div>
        <TagGroup label={t("Skills")} items={profile.skills} />
        <TagGroup label={t("Interests")} items={profile.interests} />
      </aside>
    </div>
  );
}

export function PublicProfilePage({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<Array<{ id: string; rating: number; comment: string }>>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        const [nextProfile, feedbackResponse] = await Promise.all([
          kometaApi.users.getById(userId),
          kometaApi.users.listFeedback(userId),
        ]);
        if (isActive) {
          setProfile(nextProfile);
          setFeedback(feedbackResponse.items);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error ? caughtError.message : t("Profile failed to load."),
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      isActive = false;
    };
  }, [userId]);

  if (isLoading) {
    return <LoadingState label={t("Loading profile")} />;
  }

  if (!profile) {
    return <ErrorState message={error ?? t("Profile is unavailable.")} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="grid gap-5">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{profile.name}</h1>
          <p className="mt-2 text-muted-foreground">{profile.location}</p>
        </div>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{t("About")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="leading-7">{profile.bio}</p>
            <TagGroup label={t("Skills")} items={profile.skills} />
            <TagGroup label={t("Interests")} items={profile.interests} />
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{t("Feedback")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {feedback.length ? (
              feedback.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                    <Star className="size-4 text-primary" />
                    {item.rating}/5
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{item.comment}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("No feedback yet.")}</p>
            )}
          </CardContent>
        </Card>
      </section>
      <aside className="grid h-fit gap-4 rounded-lg border p-5">
        <div className="flex items-center gap-2 text-sm">
          <Star className="size-4 text-primary" />
          {profile.rating.toFixed(1)} {t("rating")}
        </div>
        <p className="text-sm text-muted-foreground">
          {profile.completedTasks} {t("completed tasks")}
        </p>
        <Badge className="w-fit" variant="outline">
          {t(profile.accountStatus)}
        </Badge>
        <Button asChild variant="outline">
          <Link href={`/app/reports/new?reportedUserId=${profile.id}`}>
            <ShieldAlert />
            {t("Report user")}
          </Link>
        </Button>
      </aside>
    </div>
  );
}

function TagGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => <Badge key={item}>{item}</Badge>)
        ) : (
          <Badge>{t("None yet")}</Badge>
        )}
      </div>
    </div>
  );
}
