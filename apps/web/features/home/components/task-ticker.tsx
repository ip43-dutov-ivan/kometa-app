"use client";

import { t } from "@kometa/i18n";

const tasks = [
  "Help me assemble IKEA desk",
  "Walk my dog",
  "Tutor me in Python",
  "Pick up groceries",
  "Fix my WiFi router",
  "Move a couch",
  "Water my plants while away",
  "Help with math homework",
  "Hang picture frames",
  "Drop off dry cleaning",
  "Quick photography session",
  "Build a spreadsheet",
  "Clean up my garage",
  "Set up smart home devices",
];

export function TaskTicker() {
  return (
    <section className="py-16 overflow-hidden">
      <div className="relative">
        {/* Gradient overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* Scrolling container */}
        <div className="flex animate-marquee">
          {/* First set */}
          {tasks.map((task, index) => (
            <div
              key={`first-${index}`}
              className="flex-shrink-0 mx-3 px-5 py-2.5 rounded-full border border-border bg-card text-sm text-muted-foreground whitespace-nowrap hover:border-primary/50 hover:text-foreground transition-colors"
            >
              {t(task)}
            </div>
          ))}
          {/* Duplicate for seamless loop */}
          {tasks.map((task, index) => (
            <div
              key={`second-${index}`}
              className="flex-shrink-0 mx-3 px-5 py-2.5 rounded-full border border-border bg-card text-sm text-muted-foreground whitespace-nowrap hover:border-primary/50 hover:text-foreground transition-colors"
            >
              {t(task)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
