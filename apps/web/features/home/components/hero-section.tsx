"use client";

import { t } from "@kometa/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, DollarSign, MapPin, User } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 pb-20 px-4 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Copy */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight text-balance">
              {t("Micro-tasks.")} <span className="text-primary">{t("Mutual aid.")}</span>{" "}
              {t("Zero friction.")}
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed text-pretty">
              {t(
                "A peer-to-peer platform where anyone can post or complete micro-tasks. No rigid roles. No complex portfolios. Just fast, local help when you need it.",
              )}
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="secondary" className="rounded-full h-12 px-8 text-base font-medium">
                {t("Post a Task")}
              </Button>
              <Button className="rounded-full h-12 px-8 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                {t("Find a Task")}
              </Button>
            </div>
          </div>

          {/* Right side - App Mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Phone frame */}
              <div className="relative w-[280px] sm:w-[320px] h-[580px] sm:h-[640px] bg-card rounded-[3rem] border border-border shadow-2xl shadow-primary/5 p-3">
                {/* Screen */}
                <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden p-4 flex flex-col">
                  {/* Status bar mockup */}
                  <div className="flex justify-between items-center px-2 mb-4">
                    <span className="text-xs text-muted-foreground">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-2 rounded-sm bg-muted-foreground/50" />
                      <div className="w-4 h-2 rounded-sm bg-muted-foreground/50" />
                      <div className="w-6 h-3 rounded-sm bg-primary" />
                    </div>
                  </div>

                  {/* App header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground">{t("Nearby Tasks")}</h3>
                    <p className="text-xs text-muted-foreground">{t("3 available in your area")}</p>
                  </div>

                  {/* Task cards */}
                  <div className="flex-1 space-y-3 overflow-hidden">
                    <TaskCard
                      title={t("Help me assemble IKEA desk")}
                      location={t("0.3 mi away")}
                      time={t("~45 min")}
                      price="$25"
                      user={t("Sarah M.")}
                    />
                    <TaskCard
                      title={t("Walk my dog this afternoon")}
                      location={t("0.5 mi away")}
                      time={t("~30 min")}
                      price="$15"
                      user={t("Marcus T.")}
                      highlighted
                    />
                    <TaskCard
                      title={t("Quick Python tutoring")}
                      location={t("Remote")}
                      time={t("~1 hr")}
                      price="$40"
                      user={t("Alex K.")}
                    />
                  </div>
                </div>
              </div>

              {/* Glow effect */}
              <div className="absolute -inset-4 bg-primary/20 rounded-[4rem] blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskCard({
  title,
  location,
  time,
  price,
  user,
  highlighted = false,
}: {
  title: string;
  location: string;
  time: string;
  price: string;
  user: string;
  highlighted?: boolean;
}) {
  return (
    <Card
      className={`p-3 border ${
        highlighted ? "border-primary/50 bg-primary/5" : "border-border bg-card"
      } rounded-2xl`}
    >
      <h4 className="font-medium text-sm text-foreground mb-2 truncate">{title}</h4>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{time}</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-primary" />
          <span className="text-primary font-medium">{price}</span>
        </div>
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span>{user}</span>
        </div>
      </div>
    </Card>
  );
}
