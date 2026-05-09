"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@kometa/i18n";
import { getApiErrorMessage, getApiFieldErrors, getApiNonFieldErrors } from "@kometa/logic";
import { LogIn, UserPlus } from "lucide-react";
import { kometaUnauthenticatedApi } from "@/shared/api/client";
import { ErrorState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { setSession } = useKometaSession();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const session = isRegister
        ? await kometaUnauthenticatedApi.auth.register({
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
          })
        : await kometaUnauthenticatedApi.auth.login({
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
          });

      setSession(session);
      router.push(isRegister ? "/app/onboarding" : "/app");
    } catch (caughtError) {
      const nextFieldErrors = getApiFieldErrors(caughtError);
      const hasFieldErrors = Object.keys(nextFieldErrors).length > 0;
      const hasNonFieldErrors = getApiNonFieldErrors(caughtError).length > 0;

      setError(
        hasFieldErrors && !hasNonFieldErrors
          ? null
          : getApiErrorMessage(caughtError, t("Authentication failed.")),
      );
      setFieldErrors(nextFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Link href="/" className="font-heading text-xl font-semibold">
          {t("Kometa")}
        </Link>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isRegister ? t("Create account") : t("Log in")}
            </CardTitle>
            <CardDescription>
              {isRegister
                ? t("Enter your email and password to get started.")
                : t("Access your tasks, responses, and profile.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onSubmit}>
              {error ? <ErrorState message={error} /> : null}
              <div className="grid gap-2">
                <Label htmlFor="email">{t("Email")}</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
                <FieldError messages={fieldErrors.email} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t("Password")}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                />
                <FieldError messages={fieldErrors.password} />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isRegister ? <UserPlus /> : <LogIn />}
                {isSubmitting ? t("Submitting") : isRegister ? t("Register") : t("Log in")}
              </Button>
            </form>
            <p className="mt-4 text-sm text-muted-foreground">
              {isRegister ? t("Already have an account?") : t("New to Kometa?")}{" "}
              <Link href={isRegister ? "/login" : "/register"} className="text-primary">
                {isRegister ? t("Log in") : t("Create one")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return <p className="text-sm text-destructive">{messages.join(" ")}</p>;
}
