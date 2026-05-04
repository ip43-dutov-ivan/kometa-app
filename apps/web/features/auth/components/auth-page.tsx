"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { kometaApi } from "@/shared/api/client";
import { ErrorState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { setSession } = useKometaSession();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const session = isRegister
        ? await kometaApi.auth.register({
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
            name: String(formData.get("name") ?? ""),
            location: String(formData.get("location") ?? ""),
            bio: String(formData.get("bio") ?? ""),
          })
        : await kometaApi.auth.login({
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
          });

      setSession(session);
      router.push("/app");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Link href="/" className="font-heading text-xl font-semibold">
          Kometa
        </Link>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{isRegister ? "Create account" : "Log in"}</CardTitle>
            <CardDescription>
              {isRegister
                ? "Set up your profile and start using Kometa."
                : "Access your tasks, responses, and profile."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onSubmit}>
              {error ? <ErrorState message={error} /> : null}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                />
              </div>
              {isRegister ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" autoComplete="name" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" autoComplete="address-level2" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" name="bio" rows={4} required />
                  </div>
                </>
              ) : null}
              <Button type="submit" disabled={isSubmitting}>
                {isRegister ? <UserPlus /> : <LogIn />}
                {isSubmitting ? "Submitting" : isRegister ? "Register" : "Log in"}
              </Button>
            </form>
            <p className="mt-4 text-sm text-muted-foreground">
              {isRegister ? "Already have an account?" : "New to Kometa?"}{" "}
              <Link href={isRegister ? "/login" : "/register"} className="text-primary">
                {isRegister ? "Log in" : "Create one"}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
