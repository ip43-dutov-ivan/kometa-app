"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Pencil } from "lucide-react";
import { useStore } from "zustand";
import { t } from "@kometa/i18n";
import {
  onboardingStore,
  SKIPPABLE_FROM_STEP,
  STEP_COUNT,
  selectOnboardingBio,
  selectOnboardingDirection,
  selectOnboardingError,
  selectOnboardingIsSubmitting,
  selectOnboardingName,
  selectOnboardingSkills,
  selectOnboardingStep,
} from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { SkillsPicker } from "@/shared/components/skills-picker";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const cardVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "110%" : "-110%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? "-110%" : "110%", opacity: 0 }),
};

const transition = { duration: 0.3, ease: [0.32, 0.72, 0, 1] as const };

const STEP_TITLES = [t("Who are you?"), t("Tell your story"), t("What are you good at?")];

const STEP_DESCRIPTIONS = [
  t("Add your name and a profile photo."),
  t("Write a short bio so others know what you’re about."),
  t("Skills help task owners find the right person."),
];

export function OnboardingFlow() {
  const router = useRouter();
  const { user, setUser } = useKometaSession();

  const step = useStore(onboardingStore, selectOnboardingStep);
  const direction = useStore(onboardingStore, selectOnboardingDirection);
  const name = useStore(onboardingStore, selectOnboardingName);
  const bio = useStore(onboardingStore, selectOnboardingBio);
  const skills = useStore(onboardingStore, selectOnboardingSkills);
  const isSubmitting = useStore(onboardingStore, selectOnboardingIsSubmitting);
  const error = useStore(onboardingStore, selectOnboardingError);

  const { setName, setBio, setSkills, goNext, goPrev, setSubmitting, setError, reset } =
    onboardingStore.getState();

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(`kometa.onboarding.state.${user.id}`);
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      onboardingStore.setState({
        step: ([0, 1, 2] as const).includes(p.step) ? p.step : 0,
        name: typeof p.name === "string" ? p.name : "",
        bio: typeof p.bio === "string" ? p.bio : "",
        skills: Array.isArray(p.skills) ? p.skills : [],
      });
    } catch {
      // ignore malformed data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    return onboardingStore.subscribe((s) => {
      localStorage.setItem(
        `kometa.onboarding.state.${userId}`,
        JSON.stringify({ step: s.step, name: s.name, bio: s.bio, skills: s.skills }),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const avatarUrl = user?.avatarUrl ?? "";
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const isLastStep = step === STEP_COUNT - 1;
  const isFirstStep = step === 0;
  const canSkip = step >= SKIPPABLE_FROM_STEP;
  const isNextDisabled = (step === 0 && !name.trim()) || isSubmitting || isUploadingAvatar;

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const nextProfile = await kometaApi.users.uploadAvatar(file);
      setUser(nextProfile);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : t("Avatar upload failed."));
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  }

  async function handleFinish() {
    setError(null);
    setSubmitting(true);
    try {
      const nextProfile = await kometaApi.users.updateMe({
        name: name.trim(),
        bio,
        skills,
      });
      setUser(nextProfile);
      if (user) {
        localStorage.setItem(`kometa.onboarding.done.${user.id}`, "1");
        localStorage.removeItem(`kometa.onboarding.state.${user.id}`);
      }
      reset();
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Profile setup failed."));
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (isLastStep) {
      handleFinish();
    } else {
      goNext();
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="font-heading text-3xl font-semibold">{t("Welcome to Kometa")}</p>
          <p className="mt-2 text-muted-foreground">{t("Let’s set up your profile.")}</p>
        </div>

        {/* Step dots */}
        <div className="mb-6 flex justify-center gap-2">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full bg-muted transition-all duration-300",
                i === step ? "w-6 bg-primary" : "w-2",
              )}
            />
          ))}
        </div>

        {/* Card row with flanking arrows */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goPrev}
            disabled={isFirstStep || isSubmitting}
            aria-label={t("Previous step")}
            className="shrink-0"
          >
            <ChevronLeft className="size-5" />
          </Button>

          <div className="relative min-w-0 flex-1 overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
              >
                <Card className="rounded-lg">
                  <CardHeader>
                    <CardTitle>{STEP_TITLES[step]}</CardTitle>
                    <CardDescription>{STEP_DESCRIPTIONS[step]}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {step === 0 && (
                      <>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            className="group relative cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            aria-label={t("Change avatar")}
                          >
                            <Avatar className="size-20">
                              <AvatarImage src={avatarUrl} alt={name || t("Avatar")} />
                              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-100">
                              {isUploadingAvatar ? (
                                <Loader2 className="size-5 animate-spin text-white" />
                              ) : (
                                <Pencil className="size-5 text-white" />
                              )}
                            </span>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleAvatarChange}
                            />
                          </button>
                          <div>
                            <p className="text-sm font-medium">{t("Profile photo")}</p>
                            <p className="text-sm text-muted-foreground">
                              {t("Click to add an avatar")}
                            </p>
                            {avatarError ? (
                              <p className="mt-1 text-sm text-destructive">{avatarError}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="onboarding-name">{t("Name")}</Label>
                          <Input
                            id="onboarding-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            placeholder={t("Your full name")}
                            autoFocus
                          />
                        </div>
                      </>
                    )}

                    {step === 1 && (
                      <div className="grid gap-2">
                        <Label htmlFor="onboarding-bio">{t("Bio")}</Label>
                        <Textarea
                          id="onboarding-bio"
                          rows={6}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder={t("Tell others what you do and what you’re interested in…")}
                          autoFocus
                        />
                      </div>
                    )}

                    {step === 2 && (
                      <SkillsPicker value={skills} onChange={setSkills} disabled={isSubmitting} />
                    )}

                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          <Button
            variant={isLastStep ? "default" : "ghost"}
            size={isLastStep ? "default" : "icon"}
            onClick={handleNext}
            disabled={isNextDisabled}
            aria-label={isLastStep ? undefined : t("Next step")}
            className="shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : isLastStep ? (
              t("Finish")
            ) : (
              <ChevronRight className="size-5" />
            )}
          </Button>
        </div>

        {/* Skip link for optional steps */}
        {canSkip && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={isLastStep ? handleFinish : goNext}
              disabled={isSubmitting}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none"
            >
              {isLastStep ? t("Skip and finish") : t("Skip")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
