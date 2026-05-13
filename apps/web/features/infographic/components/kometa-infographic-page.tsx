const roles = [
  { label: "Pd.M", tone: "primary" },
  { label: "Pj.M", tone: "dark" },
  { label: "Arch", tone: "light" },
  { label: "Dev", tone: "light" },
  { label: "QA", tone: "primary" },
  { label: "UX", tone: "primary" },
  { label: "Ops", tone: "dark" },
] as const;

type RaciAssignment = "R" | "A" | "C" | "I" | "";
type AssignmentRow = readonly [
  RaciAssignment,
  RaciAssignment,
  RaciAssignment,
  RaciAssignment,
  RaciAssignment,
  RaciAssignment,
  RaciAssignment,
];

type Milestone = {
  id: number;
  title: string;
  assignments: AssignmentRow;
};

const milestones = [
  {
    id: 1,
    title: "Створення інфраструктури базового рівня.",
    assignments: ["I", "C", "A", "C", "I", "", "R"],
  },
  {
    id: 2,
    title: "Запуск базової функціональності та комунікації consumer-provider після матчу",
    assignments: ["C", "A", "C", "R", "R", "C", "I"],
  },
  {
    id: 3,
    title: "Запуск кредитної економіки",
    assignments: ["A", "C", "C", "R", "R", "C", "I"],
  },
  {
    id: 4,
    title: "Завершення базового зручного UI",
    assignments: ["C", "C", "", "R", "R", "A", ""],
  },
] as const satisfies readonly Milestone[];

const nextMilestones = [
  {
    id: 1,
    title: "Впровадження системи репутації, кращої за рейтинги",
    assignments: ["A", "C", "C", "R", "R", "C", ""],
  },
  {
    id: 2,
    title: "Впровадження push-сповіщень",
    assignments: ["C", "A", "C", "R", "R", "C", "R"],
  },
  {
    id: 3,
    title: "Калібрування системи та логіки match-making",
    assignments: ["A", "C", "C", "R", "R", "C", ""],
  },
  {
    id: 4,
    title: "Візуальні покращення UI",
    assignments: ["C", "C", "", "R", "R", "A", ""],
  },
] as const satisfies readonly Milestone[];

const laterMilestones = [
  {
    id: 1,
    title: "Tinder-like match-making та інтеграція календаря",
    assignments: ["A", "C", "C", "R", "R", "C", "C"],
  },
  {
    id: 2,
    title: "Покращення Safety & Security та активна модерація",
    assignments: ["A", "C", "C", "R", "R", "C", "R"],
  },
  {
    id: 3,
    title: "Впровадження складної бізнес-логіки",
    assignments: ["A", "C", "C", "R", "R", "", ""],
  },
  {
    id: 4,
    title: "Data Warehousing та аналітика",
    assignments: ["A", "C", "C", "R", "R", "", "R"],
  },
] as const satisfies readonly Milestone[];

const roleToneClass = {
  primary:
    "border-primary/70 bg-primary text-primary-foreground shadow-[0_0_28px_rgb(103_232_249/0.24)]",
  dark: "border-white/15 bg-white text-background",
  light: "border-primary/30 bg-primary/15 text-primary",
  steel: "border-white/20 bg-white/12 text-foreground",
} as const;

export function KometaInfographicPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 print:gap-4 print:py-2">
        <InfographicSection
          label="NOW"
          goal="Завершення та запуск Kometa MVP"
          milestones={milestones}
        />
        <InfographicSection
          label="NEXT"
          goal="Покращення загального користувацького досвіду"
          milestones={nextMilestones}
        />
        <InfographicSection
          label="LATER"
          goal="Масштабування продукту та гейміфікація"
          milestones={laterMilestones}
        />
      </div>
    </main>
  );
}

function InfographicSection({
  label,
  goal,
  milestones,
}: {
  label: string;
  goal: string;
  milestones: readonly Milestone[];
}) {
  return (
    <section className="flex w-full flex-col justify-start print:break-inside-avoid">
      <div className="overflow-x-auto pb-4">
        <div className="mb-5 grid min-w-[952px] grid-cols-[280px_362px_270px] items-center gap-5 print:mb-3">
          <div className="flex h-14 items-center justify-center rounded-lg border border-primary/40 bg-primary px-8 font-heading text-2xl font-semibold text-primary-foreground shadow-[0_0_32px_rgb(103_232_249/0.25)]">
            {label}
          </div>

          <div className="relative h-10">
            <div className="absolute top-1/2 left-0 h-3 w-[calc(100%-1.25rem)] -translate-y-1/2 rounded-full bg-primary/70" />
            <div className="absolute top-1/2 right-0 h-0 w-0 -translate-y-1/2 border-y-[22px] border-l-[28px] border-y-transparent border-l-primary/70" />
          </div>

          <div className="flex min-h-14 items-center gap-4 rounded-lg border border-white/55 bg-white/[0.03] px-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/80 font-heading text-xl font-semibold text-background">
              G
            </div>
            <p className="max-w-[196px] text-sm leading-snug text-muted-foreground">{goal}</p>
          </div>
        </div>

        <div className="grid min-w-[952px] grid-cols-[280px_repeat(7,92px)] gap-x-1">
          <div />
          {roles.map((role) => (
            <div key={role.label} className="px-2 pb-3">
              <div
                className={`flex h-11 items-center justify-center rounded-md border font-heading text-2xl font-semibold ${roleToneClass[role.tone]}`}
              >
                {role.label}
              </div>
            </div>
          ))}

          {milestones.map((milestone) => (
            <Row key={milestone.id} milestone={milestone} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Row({ milestone }: { milestone: Milestone }) {
  return (
    <>
      <div className="flex min-h-20 items-center py-2 pr-3">
        <div className="flex min-h-16 w-full items-center gap-4 rounded-lg border border-white/30 bg-white/[0.03] px-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-base font-semibold text-primary-foreground">
            {milestone.id}
          </div>
          <p className="text-sm leading-snug text-muted-foreground">{milestone.title}</p>
        </div>
      </div>

      {milestone.assignments.map((assignment, index) => (
        <div key={`${milestone.id}-${roles[index].label}`} className="relative min-h-20">
          <div className="absolute inset-x-0 top-0 h-px bg-white/55" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/55" />
          <div className="absolute top-0 bottom-0 left-0 w-px bg-white/55" />
          {index === roles.length - 1 && (
            <div className="absolute top-0 right-0 bottom-0 w-px bg-white/55" />
          )}
          {assignment ? (
            <div className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary font-heading text-xl font-semibold text-primary-foreground shadow-[0_0_24px_rgb(103_232_249/0.34)]">
              {assignment}
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}
